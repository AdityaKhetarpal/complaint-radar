# %% [markdown]
# # 04 · Route each complaint to the right team (text classification)
#
# **The business problem:** a complaint arrives as free text. Someone has to read it and send it to the right team:
# cards, mortgages, debt collection and so on. Here a model reads the customer's words and predicts the **product**.
#
# **How we judge it:** the customer also picked a product on the form, so we know the right answer for every
# complaint. We hide 20% of complaints, train on the rest, and check the predictions on the hidden 20%.
#
# **Steps:** a "guess the biggest class" baseline first, then three classic text models. Every run is logged in
# MLflow so the comparison is saved, not just printed.

# %%
from radar import setup, run_sql, save_table, mlflow_setup, ON_DATABRICKS, CATALOG, SCHEMA
setup()

# %% [markdown]
# ### Load the complaints

# %%
data = run_sql("SELECT complaint_id, product, text, narrative FROM complaints")
data["product"].value_counts()

# %% [markdown]
# ### Split into training and test sets
# `stratify` keeps the same mix of products in both parts. `random_state` makes the split the same every run.

# %%
from sklearn.model_selection import train_test_split

train, test = train_test_split(data, test_size=0.2, stratify=data["product"], random_state=42)
print(f"train: {len(train):,} complaints · test: {len(test):,} complaints")

# %% [markdown]
# ### Baseline: always guess the most common product
# Any real model has to beat this. With a balanced sample it's low, which is the point: it shows how much the
# model actually learns from the words.

# %%
from sklearn.metrics import accuracy_score, f1_score

most_common = train["product"].mode()[0]
baseline = {"accuracy": accuracy_score(test["product"], [most_common] * len(test)),
            "macro_f1": f1_score(test["product"], [most_common] * len(test), average="macro")}
baseline

# %% [markdown]
# ### Turn words into numbers: TF-IDF
# A model can't read text, so each complaint becomes a long list of numbers, one per word or two-word phrase.
# **TF-IDF** gives a phrase a high number when it appears often in this complaint but rarely in others,
# so "escrow" counts for a lot and "the" counts for nothing.

# %%
from sklearn.feature_extraction.text import TfidfVectorizer

def tfidf():
    return TfidfVectorizer(ngram_range=(1, 2),     # single words and two-word phrases ("late fee")
                           min_df=3,               # ignore phrases seen in fewer than 3 complaints
                           max_df=0.5,             # ignore phrases in more than half of all complaints
                           max_features=150_000,
                           sublinear_tf=True,      # 10 mentions isn't 10 times as important as 1
                           stop_words="english")

# %% [markdown]
# ### Three models to compare
# * **Logistic regression**: learns a weight for every phrase and product; easy to explain.
# * **Linear SVM**: similar, often slightly more accurate on text.
# * **Complement naive Bayes**: very fast, a classic for text.

# %%
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import ComplementNB
from sklearn.svm import LinearSVC
from sklearn.pipeline import make_pipeline

MODELS = {
    "logistic_regression": lambda: LogisticRegression(C=4.0, max_iter=2000),
    "linear_svm": lambda: LinearSVC(C=0.5),
    "complement_nb": lambda: ComplementNB(alpha=0.3),
}

# %% [markdown]
# ### Train each model and log it in MLflow
# For each model: train, predict the test set, and log the settings, the scores and the training time.

# %%
import time
mlflow = mlflow_setup()

results, fitted = [], {}
for name, make in MODELS.items():
    with mlflow.start_run(run_name=name):
        model = make_pipeline(tfidf(), make())
        start = time.time()
        model.fit(train["text"], train["product"])
        seconds = time.time() - start
        pred = model.predict(test["text"])
        scores = {"accuracy": accuracy_score(test["product"], pred),
                  "macro_f1": f1_score(test["product"], pred, average="macro"),
                  "train_seconds": seconds}
        mlflow.log_params({"model": name, "train_rows": len(train), "test_rows": len(test)})
        mlflow.log_metrics(scores)
        mlflow.log_metric("baseline_macro_f1", baseline["macro_f1"])
        results.append({"model": name, **scores})
        fitted[name] = model

import pandas as pd
data =pd.DataFrame(results).sort_values("macro_f1", ascending=False).round(4)
data

# %% [markdown]
# ### Pick the best model
# We pick by **macro F1**: the F1 score of every product, averaged with equal weight. Plain accuracy would let the
# model ignore small products and still look good.

# %%
best_name = data.iloc[0]["model"]
best = fitted[best_name]
pred = best.predict(test["text"])
print("best:", best_name)

# %% [markdown]
# ### Scores per product
# Precision: when the model says "Mortgage", how often it's right. Recall: of all real mortgage complaints,
# how many it found.

# %%
from sklearn.metrics import classification_report
data = pd.DataFrame(classification_report(test["product"], pred, output_dict=True)).T.round(3)
save_table(data.rename_axis("label").reset_index(), "class_report")
data

# %% [markdown]
# ### Confusion matrix: which products get mixed up
# Each row is the real product; each column is what the model said. The diagonal is "right". The biggest
# off-diagonal cells show where the categories genuinely overlap: a complaint about a collector reporting a debt
# to the credit bureaus is both "Debt collection" and "Credit reporting".

# %%
from sklearn.metrics import confusion_matrix
labels = sorted(data.index.drop(["accuracy", "macro avg", "weighted avg"]))
matrix = confusion_matrix(test["product"], pred, labels=labels)
data = pd.DataFrame(matrix, index=labels, columns=labels)
save_table(data.rename_axis("actual").reset_index().melt(id_vars="actual", var_name="predicted", value_name="complaints"), "confusion")
data

# %% [markdown]
# ### How sure is the model? (for auto-routing)
# In real life you wouldn't trust every prediction. A common setup: send a complaint automatically when the model
# is confident, and to a person when it isn't. Logistic regression gives a probability for each product, so we
# check how many complaints clear each confidence bar, and how accurate those are.

# %%
import numpy as np
lr = fitted["logistic_regression"]
proba = lr.predict_proba(test["text"])
confidence = proba.max(axis=1)
lr_pred = lr.classes_[proba.argmax(axis=1)]
rows = []
for bar in [0.0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]:
    sure = confidence >= bar
    rows.append({"confidence_at_least": bar,
                 "auto_routed_pct": round(100 * sure.mean(), 1),
                 "accuracy_of_auto_routed_pct": round(100 * (lr_pred[sure] == test["product"].values[sure]).mean(), 1)})
data = pd.DataFrame(rows)
save_table(data, "routing")
data

# %% [markdown]
# ### Words that push a complaint towards each product
# Logistic regression is easy to explain: every phrase has a weight per product. The highest weights are the
# phrases that most strongly point to that product.

# %%
vec, clf = lr.named_steps["tfidfvectorizer"], lr.named_steps["logisticregression"]
words = np.array(vec.get_feature_names_out())
rows = []
for i, product in enumerate(clf.classes_):
    top = np.argsort(clf.coef_[i])[::-1][:10]
    rows.append({"product": product, "top_phrases": ", ".join(words[top])})
data = pd.DataFrame(rows)
save_table(data, "top_phrases")
data

# %% [markdown]
# ### Look at mistakes
# We save 12 random wrong predictions.
# Reading wrong predictions is the fastest way to learn what the model can't do. Many "mistakes" are complaints
# that really are about two products.

# %%
data = test.assign(predicted=pred)
data = data[data["product"] != data["predicted"]]
data = data.sample(min(12, len(data)), random_state=7)
data["excerpt"] = data["narrative"].str.slice(0, 280) + "…"
data = data[["complaint_id", "product", "predicted", "excerpt"]]
save_table(data, "mistakes")
data

# %% [markdown]
# ### Save the predictions and the scores as tables
# For the website and for anyone who wants to dig in.

# %%
data = test[["complaint_id", "product"]].assign(predicted=lr_pred, confidence=confidence.round(4))
save_table(data, "predictions")

# %%
data = pd.DataFrame(results).assign(baseline_macro_f1=baseline["macro_f1"], train_rows=len(train), test_rows=len(test))
save_table(data, "model_scores")

# %% [markdown]
# ### Register the model (Databricks only)
# On Databricks the logistic regression is saved to Unity Catalog as `complaint_router`, so it can be loaded
# by name or served behind an endpoint. Locally we skip this.

# %%
if ON_DATABRICKS:
    from mlflow.models import infer_signature
    with mlflow.start_run(run_name="register_complaint_router"):
        mlflow.sklearn.log_model(lr, name="model", input_example=test["text"].head(3).tolist(),
                                 signature=infer_signature(test["text"].head(20), lr.predict(test["text"].head(20))),
                                 registered_model_name=f"{CATALOG}.{SCHEMA}.complaint_router")
    print(f"registered {CATALOG}.{SCHEMA}.complaint_router")
