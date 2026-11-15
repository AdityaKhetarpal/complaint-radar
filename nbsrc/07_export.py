# %% [markdown]
# # 07 · Export for the website
#
# **What this notebook does:** reads the gold and model tables and writes small JSON files to `web/public/data/`.
# The website only reads these files, so every number on it comes from this pipeline.

# %%
from radar import setup, run_sql, EXPORT, llm_name
setup()
EXPORT.mkdir(parents=True, exist_ok=True)

# %% [markdown]
# ### A helper to write JSON
# Dates become `YYYY-MM-DD` text and missing values become `null`, which JavaScript understands.

# %%
import json
from datetime import date, datetime
import math

def clean_value(v):
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    if hasattr(v, "isoformat") and hasattr(v, "year"):            # pandas Timestamp
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):                                         # numpy numbers
        return v.item()
    return v

def records(data):
    return [{k: clean_value(v) for k, v in row.items()} for row in data.to_dict("records")]

def write(name, payload):
    path = EXPORT / f"{name}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=clean_value))
    print(f"{path.name}: {path.stat().st_size / 1024:,.0f} KB")

# %% [markdown]
# ### Headline numbers

# %%
data = run_sql("""
    SELECT SUM(complaints) AS complaints, MIN(month) AS first_month, MAX(month) AS last_month,
           SUM(CASE WHEN has_narrative THEN complaints ELSE 0 END) AS with_narrative
    FROM monthly_counts
""")
headline = records(data)[0]
headline["sample"] = int(run_sql("SELECT COUNT(*) AS n FROM complaints")["n"][0])
headline["companies_scored"] = int(run_sql("SELECT COUNT(*) AS n FROM gold_companies")["n"][0])
headline["llm"] = llm_name()
headline["archive_cutoff"] = "2026-08-14"
headline

# %% [markdown]
# ### Trends, products, issues, companies

# %%
write("overview", {
    "headline": headline,
    "monthly": records(run_sql("SELECT month, product, complaints FROM gold_monthly ORDER BY month, product")),
    "products": records(run_sql("SELECT * FROM gold_products ORDER BY complaints DESC")),
    "issues": records(run_sql("SELECT * FROM gold_issues ORDER BY product, rank_in_product")),
    "growth": records(run_sql("SELECT * FROM gold_issue_growth ORDER BY change_pct DESC")),
})

# %%
write("companies", {
    "companies": records(run_sql("SELECT * FROM gold_companies ORDER BY complaints DESC LIMIT 40")),
    "products": records(run_sql("""
        SELECT cp.* FROM gold_company_products cp
        JOIN (SELECT company FROM gold_companies ORDER BY complaints DESC LIMIT 40) top ON top.company = cp.company
        ORDER BY cp.company, cp.complaints DESC
    """)),
    "responses": records(run_sql("SELECT * FROM gold_responses ORDER BY product, complaints DESC")),
})

# %% [markdown]
# ### The routing model

# %%
write("model", {
    "scores": records(run_sql("SELECT * FROM model_scores ORDER BY macro_f1 DESC")),
    "classes": records(run_sql("SELECT * FROM class_report")),
    "confusion": records(run_sql("SELECT * FROM confusion")),
    "routing": records(run_sql("SELECT * FROM routing ORDER BY confidence_at_least")),
    "phrases": records(run_sql("SELECT * FROM top_phrases ORDER BY product")),
    "mistakes": records(run_sql("SELECT * FROM mistakes")),
    "llm": records(run_sql("SELECT * FROM llm_comparison")),
    "llm_rows": int(run_sql("SELECT COUNT(*) AS n FROM llm_predictions")["n"][0]),
})

# %% [markdown]
# ### Topics with their names, summaries and examples
# The website shows the first 3 examples of each topic, cut to 600 characters.

# %%
data = run_sql("""
    SELECT t.*, n.name, n.summary FROM topics t LEFT JOIN topic_names n ON n.topic = t.topic
    ORDER BY t.complaints DESC
""")
examples = run_sql("SELECT topic, rank, complaint_id, product, narrative FROM topic_examples WHERE rank <= 3 ORDER BY topic, rank")
examples["narrative"] = examples["narrative"].str.slice(0, 600)
write("topics", {
    "topics": records(data),
    "examples": records(examples),
    "trend": records(run_sql("SELECT * FROM topic_trend ORDER BY month, topic")),
})

# %% [markdown]
# ### The assistant's answers, with the complaints they came from

# %%
data = run_sql("SELECT * FROM assistant_answers")
ids = sorted({i for s in data["sources"] for i in s.split(",") if i})
id_list = ",".join(f"'{i}'" for i in ids)
sources = run_sql(f"SELECT complaint_id, product, date_received, narrative FROM complaints WHERE complaint_id IN ({id_list})")
sources["narrative"] = sources["narrative"].str.slice(0, 700)
write("assistant", {"answers": records(data), "sources": records(sources)})

# %% [markdown]
# ### Ask-the-data examples
# The same questions and SQL given to the Genie space as trusted queries (see `genie/`), with their results.

# %%
from pathlib import Path
import re
from radar import ROOT
text = (ROOT / "genie" / "trusted_queries.sql").read_text()
blocks = [b.strip() for b in re.split(r"\n(?=-- Q: )", text) if b.strip().startswith("-- Q: ")]
rows = []
for block in blocks:
    question = block.splitlines()[0][6:].strip()
    sql = "\n".join(block.splitlines()[1:]).strip().rstrip(";")
    rows.append({"question": question, "sql": sql, "result": records(run_sql(sql))})
write("ask", {"examples": rows})
