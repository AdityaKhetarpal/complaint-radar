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
# ### Copy-paste letters
# Some complaints are the same letter sent many times (often from credit repair templates). If we kept every copy,
# a single template would become its own "topic". So the model learns from one copy of each letter: we treat
# complaints whose first 200 characters are identical as copies. Every complaint still gets a topic afterwards.

# %%
data["opening"] = data["text"].str.slice(0, 200)
copies = data.groupby("opening")["complaint_id"].transform("count")
print(f"{(copies > 1).sum():,} complaints share their opening with another complaint")
unique = data.drop_duplicates("opening")
print(f"{len(unique):,} distinct letters to learn the topics from")

# %% [markdown]
# ### Words to ignore
# Besides normal English stop words ("the", "and"), we drop two kinds of words:
# * words every complaint letter uses ("called", "told", "tried")
# * words every **financial** complaint uses ("bank", "account", "payment", "credit"), which would otherwise pull
#   very different problems into one big "money" topic
#
# What's left are the words that tell problems apart: "escrow", "repossession", "overdraft", "identity theft".

# %%
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

LETTER_WORDS = {"told", "called", "call", "said", "asked", "company", "received", "time", "day", "days", "did", "know",
                "just", "like", "want", "need", "got", "going", "make", "made", "able", "help", "contacted", "contact",
                "phone", "email", "letter", "sent", "number", "information", "amount", "consumer", "cfpb", "complaint",
                "please", "thank", "regarding", "stated", "says", "dont", "didnt", "im", "ive", "month", "months", "year",
                "years", "today", "week", "weeks", "also", "would", "could", "still", "never", "even", "one", "two", "get",
                "tried", "times", "send", "went", "trying", "saying", "person", "don", "getting", "despite", "issue",
                "resolve", "request", "requesting", "multiple", "review", "explanation"}
MONEY_WORDS = {"bank", "card", "credit", "account", "accounts", "money", "loan", "payment", "payments", "report",
               "pay", "paid", "funds", "balance", "usc", "section", "act", "law", "fcra", "fdcpa"}
STOP = list(ENGLISH_STOP_WORDS | LETTER_WORDS | MONEY_WORDS)

vectorizer = TfidfVectorizer(stop_words=STOP, ngram_range=(1, 2), min_df=15, max_df=0.25, max_features=30_000, sublinear_tf=True)
X = vectorizer.fit_transform(unique["text"])
X.shape

# %% [markdown]
# ### How many topics?
# There's no single right number. Too few and different problems merge (car loans and mortgages become one
# "loans" topic); too many and one problem splits into fragments. We try 12, 16 and 20, look at how much the top
# words of different topics overlap (lower is better: topics are more distinct), and how evenly complaints spread.

# %%
import numpy as np
import pandas as pd
from sklearn.decomposition import NMF

words = np.array(vectorizer.get_feature_names_out())

def overlap(model, n=12):
    tops = [set(words[np.argsort(row)[::-1][:n]]) for row in model.components_]
    return float(np.mean([len(a & b) / n for i, a in enumerate(tops) for b in tops[i + 1:]]))

tries = []
for k in [12, 16, 20]:
    model = NMF(n_components=k, init="nndsvda", random_state=42, max_iter=500)
    sizes = np.bincount(model.fit_transform(X).argmax(axis=1), minlength=k)
    tries.append({"topics": k, "avg_word_overlap": round(overlap(model), 4), "biggest_topic_share_pct": round(100 * sizes.max() / sizes.sum(), 1)})
data_tries = pd.DataFrame(tries)
data_tries

# %% [markdown]
# ### Fit the final model
# We use 20 topics: at 12 and 16, separate problems (car loans and late fees, for example) were still merged.

# %%
K = 20
nmf = NMF(n_components=K, init="nndsvda", random_state=42, max_iter=600)
nmf.fit(X)
W = nmf.transform(vectorizer.transform(data["text"]))     # topic weights for every complaint, copies included
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
# For each topic: its top words, how many complaints it holds, which product those complaints come from, and how
# many are copies of the same letter (a high share means a copy-paste campaign rather than many separate stories).

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
        "copy_pct": round(100 * (copies[members.index] > 1).mean(), 1) if len(members) else 0.0,  # share that are copy-paste letters
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
