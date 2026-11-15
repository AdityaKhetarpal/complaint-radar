# %% [markdown]
# # 06 · Summaries, an LLM test and a complaints assistant
#
# Three uses of a large language model (LLM), each checked rather than trusted:
#
# 1. **Name and summarise each topic** from notebook 05, so a manager reads "Frozen accounts after Zelle
#    payments" instead of a list of words.
# 2. **LLM vs the classic model:** can an LLM route complaints without any training? We compare it with the
#    TF-IDF model from notebook 04 on the same complaints, including speed.
# 3. **A complaints assistant:** ask a question in plain English; it finds the most relevant complaints and
#    answers using only those, citing complaint IDs. We check every citation is real.
#
# **Which LLM:** on Databricks, a Foundation Model endpoint called through `ai_query()`; locally and in GitHub
# Actions, the open model Qwen2.5-3B-Instruct on the CPU. No API keys anywhere.

# %%
from radar import setup, run_sql, save_table, llm, llm_name, mlflow_setup
setup()
print("LLM:", llm_name())

# %% [markdown]
# ## Part 1 · Name and summarise the topics
# ### Load the topics and their most typical complaints

# %%
topics = run_sql("SELECT * FROM topics ORDER BY topic")
data = run_sql("SELECT * FROM topic_examples ORDER BY topic, rank")
print(f"{len(topics)} topics, {len(data)} example complaints")

# %% [markdown]
# ### The prompt
# We give the model the topic's top words and its 5 most typical complaints (cut to 700 characters each), and ask
# for a short name and a two-sentence summary, as JSON so the answer is easy to read back.

# %%
def topic_prompt(words: str, complaints: list) -> str:
    shown = "\n\n".join(f"Complaint {i + 1}: {c[:700]}" for i, c in enumerate(complaints))
    return (
        "You are an analyst at a bank reviewing customer complaints sent to the US CFPB.\n"
        f"These complaints share one theme. Key words: {words}.\n\n{shown}\n\n"
        "Reply with JSON only, no other text, in exactly this form:\n"
        '{"name": "<3 to 6 word name for the theme>", "summary": "<2 sentences: what customers are complaining about and what went wrong>"}'
    )

# %% [markdown]
# ### Read the model's JSON safely
# Small models sometimes add text around the JSON. We take the part between the first `{` and the last `}`.

# %%
import json, re

def read_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.S)
    try:
        return json.loads(match.group(0)) if match else {}
    except json.JSONDecodeError:
        return {}

# %% [markdown]
# ### Ask for every topic

# %%
import time
rows = []
for _, t in topics.iterrows():
    examples = data[data["topic"] == t["topic"]]["narrative"].tolist()
    start = time.time()
    answer = read_json(llm(topic_prompt(t["top_words"], examples), max_tokens=160))
    rows.append({"topic": t["topic"], "name": answer.get("name") or f"Topic {t['topic']}",
                 "summary": answer.get("summary") or "", "seconds": round(time.time() - start, 1)})
    print(t["topic"], "·", rows[-1]["name"])
import pandas as pd
data = pd.DataFrame(rows)
data

# %%
save_table(data.drop(columns="seconds"), "topic_names")

# %% [markdown]
# ## Part 2 · Can an LLM route complaints without training?
# ### Take the same test complaints the classic model saw
# We use 200 complaints from notebook 04's test set (the LLM is slow on a CPU, so not all of them).

# %%
data = run_sql("""
    SELECT p.complaint_id, p.product, p.predicted AS tfidf_predicted, c.narrative
    FROM predictions p JOIN complaints c ON c.complaint_id = p.complaint_id
""")
data = data.sample(min(200, len(data)), random_state=11).reset_index(drop=True)
PRODUCTS = sorted(run_sql("SELECT DISTINCT product FROM complaints")["product"])
PRODUCTS

# %% [markdown]
# ### The prompt
# The model sees the list of products and one complaint, and must answer with one product name.

# %%
def route_prompt(narrative: str) -> str:
    return ("Which product is this US consumer complaint about? Choose exactly one from this list:\n"
            + "\n".join(f"- {p}" for p in PRODUCTS)
            + f"\n\nComplaint: {narrative[:1500]}\n\nAnswer with the product name only.")

def to_product(answer: str) -> str:
    """Match the model's answer to a product name; 'unknown' if it named none."""
    answer = answer.lower()
    hits = [p for p in PRODUCTS if p.lower() in answer]
    return max(hits, key=len) if hits else "unknown"

# %% [markdown]
# ### Run it and time it

# %%
answers, seconds = [], []
for text in data["narrative"]:
    start = time.time()
    answers.append(to_product(llm(route_prompt(text), max_tokens=12)))
    seconds.append(time.time() - start)
data["llm_predicted"] = answers
data["llm_seconds"] = seconds
data[["product", "tfidf_predicted", "llm_predicted"]].head(10)

# %% [markdown]
# ### Compare
# Same 200 complaints, same right answers. The classic model was trained on our data; the LLM saw only the list.

# %%
from sklearn.metrics import accuracy_score, f1_score
comparison = pd.DataFrame([
    {"model": "TF-IDF + logistic regression (trained)", "accuracy": accuracy_score(data["product"], data["tfidf_predicted"]),
     "macro_f1": f1_score(data["product"], data["tfidf_predicted"], average="macro", labels=PRODUCTS), "seconds_per_complaint": None},
    {"model": f"{llm_name()} (zero-shot)", "accuracy": accuracy_score(data["product"], data["llm_predicted"]),
     "macro_f1": f1_score(data["product"], data["llm_predicted"], average="macro", labels=PRODUCTS),
     "seconds_per_complaint": data["llm_seconds"].mean()},
]).round(4)
comparison

# %% [markdown]
# ### Log the comparison in MLflow

# %%
mlflow = mlflow_setup()
with mlflow.start_run(run_name="llm_zero_shot_routing"):
    mlflow.log_params({"llm": llm_name(), "complaints": len(data)})
    mlflow.log_metrics({"llm_accuracy": comparison.iloc[1]["accuracy"], "llm_macro_f1": comparison.iloc[1]["macro_f1"],
                        "tfidf_accuracy": comparison.iloc[0]["accuracy"], "tfidf_macro_f1": comparison.iloc[0]["macro_f1"],
                        "llm_seconds_per_complaint": data["llm_seconds"].mean()})
save_table(comparison, "llm_comparison")
save_table(data.drop(columns=["narrative"]), "llm_predictions")

# %% [markdown]
# ## Part 3 · A complaints assistant
# ### Step 1: find the relevant complaints (retrieval)
# Before the LLM answers, we find the 8 complaints most similar to the question, using TF-IDF and cosine
# similarity (how much two texts share the same important words). The LLM then answers **only** from those 8.
# This is retrieval-augmented generation (RAG) in its simplest form.

# %%
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

data = run_sql("SELECT complaint_id, product, date_received, text, narrative FROM complaints")
index_vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=3, max_df=0.5, sublinear_tf=True)
index = index_vec.fit_transform(data["text"])

def retrieve(question: str, k: int = 8) -> pd.DataFrame:
    scores = linear_kernel(index_vec.transform([question.lower()]), index).ravel()
    best = scores.argsort()[::-1][:k]
    return data.iloc[best].assign(score=scores[best])

retrieve("Zelle scam bank refused refund")[["complaint_id", "product", "score"]]

# %% [markdown]
# ### Step 2: answer from those complaints, with citations

# %%
def answer_prompt(question: str, found: pd.DataFrame) -> str:
    shown = "\n\n".join(f"[{r.complaint_id}] ({r.product}) {r.narrative[:900]}" for r in found.itertuples())
    return ("You answer questions about consumer complaints using ONLY the complaints below. "
            "Cite the complaint IDs you use in square brackets, like [1234567]. "
            "If the complaints don't answer the question, say so. Keep it under 120 words.\n\n"
            f"{shown}\n\nQuestion: {question}")

def ask(question: str) -> dict:
    found = retrieve(question)
    text = llm(answer_prompt(question, found), max_tokens=220)
    cited = set(re.findall(r"\[(\d+)\]", text))
    real = set(found["complaint_id"].astype(str))
    return {"question": question, "answer": text, "sources": found["complaint_id"].astype(str).tolist(),
            "cited": sorted(cited), "made_up_citations": sorted(cited - real)}

# %% [markdown]
# ### Ask a few questions a complaints manager would ask
# We check each answer: every complaint ID it cites must be one of the 8 it was given. A made-up ID means the
# model invented something.

# %%
QUESTIONS = [
    "What happens to customers who are scammed through Zelle and ask their bank for a refund?",
    "Why do customers say their bank account was frozen or closed?",
    "What problems do people describe with mortgage escrow and property taxes?",
    "How do debt collectors contact people about debts they say they don't owe?",
    "What goes wrong when people dispute errors on their credit report?",
    "What do customers say about credit card late fees and interest charges?",
]
rows = [ask(q) for q in QUESTIONS]
data = pd.DataFrame(rows)
data[["question", "cited", "made_up_citations"]]

# %%
print(f"answers with a made-up citation: {(data['made_up_citations'].str.len() > 0).sum()} of {len(data)}")
print(f"answers citing at least one complaint: {(data['cited'].str.len() > 0).sum()} of {len(data)}")
data["sources"] = data["sources"].map(",".join)
data["cited"] = data["cited"].map(",".join)
data["made_up_citations"] = data["made_up_citations"].map(",".join)
save_table(data, "assistant_answers")
