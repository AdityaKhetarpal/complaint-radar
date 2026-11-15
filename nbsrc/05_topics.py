# %% [markdown]
# # 05 · Find hidden themes (topic modeling)
#
# **The problem:** the CFPB form makes customers pick an issue from a fixed list. Real complaints are messier:
# "my money was frozen after a Zelle payment" doesn't fit neatly into any box. Topic modeling groups complaints
# by the words they share, **without being told the categories**, so themes nobody had a label for can show up.
#
# **Method:** NMF (non-negative matrix factorization) on TF-IDF. In plain words: it finds a small set of
# "word recipes" (topics) such that every complaint is a mix of a few recipes. Each topic is a list of words with
# weights, and each complaint gets a weight for each topic.

# %%
from radar import setup, run_sql, save_table
setup()

# %% [markdown]
# ### Load the complaints

# %%
data = run_sql("SELECT complaint_id, date_received, product, issue, text, narrative FROM complaints")
print(f"{len(data):,} complaints")

# %% [markdown]
# ### Words to ignore
# Besides normal English stop words ("the", "and"), complaint letters repeat words that say nothing about the
# topic ("company", "called", "told"). Removing them makes the topics sharper.

# %%
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

EXTRA = {"told", "called", "call", "said", "asked", "company", "received", "time", "day", "days", "did", "know",
         "just", "like", "want", "need", "got", "going", "make", "made", "able", "help", "contacted", "contact",
         "phone", "email", "letter", "sent", "number", "information", "amount", "consumer", "cfpb", "complaint",
         "please", "thank", "regarding", "stated", "says", "dont", "didnt", "im", "ive", "month", "months", "year",
         "years", "today", "week", "weeks", "also", "would", "could", "still", "never", "even", "one", "two", "get"}
STOP = list(ENGLISH_STOP_WORDS | EXTRA)

vectorizer = TfidfVectorizer(stop_words=STOP, ngram_range=(1, 2), min_df=10, max_df=0.4, max_features=40_000, sublinear_tf=True)
X = vectorizer.fit_transform(data["text"])
X.shape

# %% [markdown]
# ### How many topics?
# There's no single right number. We try a few and keep the one where topics are most distinct from each other
# (lowest average overlap between their top words), between 10 and 18 so the result is readable.

# %%
import numpy as np
from sklearn.decomposition import NMF

words = np.array(vectorizer.get_feature_names_out())

def top_words(model, n=12):
    return [set(words[np.argsort(row)[::-1][:n]]) for row in model.components_]

def overlap(model):
    tops = top_words(model)
    pairs = [len(a & b) / 12 for i, a in enumerate(tops) for b in tops[i + 1:]]
    return float(np.mean(pairs))

tries = []
for k in [10, 12, 14, 16, 18]:
    model = NMF(n_components=k, init="nndsvda", random_state=42, max_iter=400)
    model.fit(X)
    tries.append({"topics": k, "avg_word_overlap": round(overlap(model), 4)})
import pandas as pd
data_tries = pd.DataFrame(tries)
data_tries

# %% [markdown]
# ### Fit the final model
# Among the tries, take the number of topics with the least overlap.

# %%
K = int(data_tries.sort_values(["avg_word_overlap", "topics"]).iloc[0]["topics"])
nmf = NMF(n_components=K, init="nndsvda", random_state=42, max_iter=600)
W = nmf.fit_transform(X)                     # complaint x topic weights
print(f"{K} topics")

# %% [markdown]
# ### Give every complaint its main topic
# A complaint's main topic is the one with the highest weight. Complaints with almost no weight anywhere
# (very generic letters) are marked as topic -1, "unclear".

# %%
data["topic"] = W.argmax(axis=1)
data["topic_weight"] = W.max(axis=1)
data.loc[data["topic_weight"] < 0.01, "topic"] = -1
data["topic"].value_counts().sort_index()

# %% [markdown]
# ### Describe each topic
# For each topic: its top words, how many complaints it holds, and which product those complaints come from.

# %%
rows = []
for t in range(K):
    members = data[data["topic"] == t]
    product_mix = members["product"].value_counts(normalize=True).head(3)
    rows.append({
        "topic": t,
        "top_words": ", ".join(words[np.argsort(nmf.components_[t])[::-1][:12]]),
        "complaints": len(members),
        "share_pct": round(100 * len(members) / len(data), 1),
        "main_products": "; ".join(f"{p} {v:.0%}" for p, v in product_mix.items()),
        "top_issue": members["issue"].mode()[0] if len(members) else None,
    })
topics = pd.DataFrame(rows)
data_topics = topics.sort_values("complaints", ascending=False)
data_topics

# %% [markdown]
# ### The most typical complaints of each topic
# The complaints with the highest weight for a topic are its clearest examples. We keep 5 per topic: notebook 06
# shows them to a language model to name and summarise the topic, and the website shows a few.

# %%
examples = []
for t in range(K):
    best = np.argsort(W[:, t])[::-1][:5]
    for rank, i in enumerate(best):
        examples.append({"topic": t, "rank": rank + 1, "complaint_id": data.iloc[i]["complaint_id"],
                         "product": data.iloc[i]["product"], "narrative": data.iloc[i]["narrative"]})
data_examples = pd.DataFrame(examples)
data_examples.head()

# %% [markdown]
# ### Topic trends over time
# How each topic's share of the sample changes month by month (through July 2026, the last full month).

# %%
data["month"] = pd.to_datetime(data["date_received"]).dt.to_period("M").dt.to_timestamp()
trend = data[(data["topic"] >= 0) & (data["month"] < "2026-08-01")]
trend = trend.groupby(["month", "topic"]).size().rename("complaints").reset_index()
trend["share_pct"] = (100 * trend["complaints"] / trend.groupby("month")["complaints"].transform("sum")).round(2)
trend.tail()

# %% [markdown]
# ### Save everything as tables

# %%
save_table(topics, "topics")
save_table(data_examples, "topic_examples")
save_table(trend, "topic_trend")
save_table(data[["complaint_id", "topic", "topic_weight"]], "complaint_topics")
