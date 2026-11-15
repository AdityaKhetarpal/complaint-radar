# Complaint Radar

**What US bank customers complain about, and a model that sends each complaint to the right team.**
A Databricks lakehouse project on the US Consumer Financial Protection Bureau (CFPB) complaint database.

Live site: **[complaintradar.vercel.app](https://complaintradar.vercel.app)**

## The problem

A bank or regulator receives thousands of complaints a month as free text. Nobody can read them all, so it's hard to know
what people complain about most, whether it's getting worse, and which team should handle each complaint.

This project turns [X] complaints (January 2025 to 14 August 2026) into:

1. **Trends and gold tables** a manager can query in plain English with a Databricks **Genie** space
2. **A routing model** that reads a complaint and predicts the product team (text classification)
3. **Themes** found by topic modeling, named and summarised by an LLM
4. **A complaints assistant** that answers questions from real complaints and cites them, with every citation checked

## Results

| | |
|---|---|
| Complaints analysed | [X] (all complaints), [X] narratives in the modeling sample |
| Routing model (best of 3) | macro F1 [X] vs [X] for the baseline |
| Auto-routing at 80% confidence | [X] of complaints routed, [X] of those correct |
| LLM zero-shot routing (Qwen2.5-3B) | macro F1 [X] vs [X] for the trained model on the same complaints |
| Themes found | [X] |
| Assistant answers with made-up citations | [X] of [X] |

## How it works

```
CFPB archive ─► 01 acquire ─► 02 load & clean ─► 03 SQL gold tables ─► Genie space / AI/BI dashboard
                                     │
                                     ├─► 04 routing model (scikit-learn, MLflow, Unity Catalog model registry)
                                     ├─► 05 topics (NMF)
                                     └─► 06 GenAI (LLM topic names, LLM vs classifier, RAG assistant) ─► 07 export ─► website
```

The same seven notebooks run in two places:

| | Databricks | GitHub Actions (feeds the website) |
|---|---|---|
| Tables | Unity Catalog, `workspace.complaint_radar` | DuckDB file |
| SQL | Spark SQL | DuckDB |
| Experiment tracking | MLflow in the workspace; model registered as `complaint_router` | MLflow, local |
| LLM | Foundation Model endpoint via `ai_query()` | Qwen2.5-3B-Instruct on the CPU |

`notebooks/radar.py` holds the few helpers that switch between the two (`save_table`, `run_sql`, `llm`, `mlflow_setup`).

## Run it on Databricks (Free Edition works)

1. Workspace → Create → **Git folder** → `https://github.com/AdityaKhetarpal/complaint-radar`
2. Run notebooks **02 to 07** in order on serverless compute. Skip 01: its output is already in `data/`, and Free Edition
   can only reach a short list of websites.
3. Tables appear in **Catalog → workspace → complaint_radar**; runs in **Experiments → complaint-radar**.
4. Create a **Genie space** on the `gold_*` tables, paste [`genie/instructions.md`](genie/instructions.md) and add the
   trusted queries in [`genie/trusted_queries.sql`](genie/trusted_queries.sql).
5. Build an **AI/BI dashboard** on the same gold tables.

Note: Databricks' ready-made Knowledge Assistant (Agent Bricks) isn't available on Free Edition, so the assistant is
built by hand in notebook 06.

## Run it locally

```bash
pip install -r requirements.txt
python scripts/run_notebooks.py 01 02 03 04 05 06 07   # 01 downloads several GB; the LLM steps need torch + transformers
cd web && npm install && npm run dev
```

## Data

- **Source:** [CFPB Consumer Complaint Database narratives archive](https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/),
  files covering January 2025 to August 2026. US government data, public domain.
- In August 2026 the CFPB stopped publishing complaint narratives; complaints published up to 14 August 2026 were moved
  to this archive. The analysis can't be extended past that date with narratives.
- The CFPB removes personal details from narratives before publishing (shown as `XXXX`).
- `data/complaints_sample.parquet`: a balanced sample of complaints with narratives (repeatable hash sample, at most
  4,000 per product). `data/complaints_monthly.parquet` and `data/companies.parquet`: counts over all complaints.

## Limits

- Complaint counts are patterns, not proof that a company did anything wrong; large companies have more customers.
- The CFPB doesn't verify every complaint.
- The "right answer" for routing is the product the customer picked, which is sometimes ambiguous.
- Topic shares describe the balanced sample, not how common each product is.

Analysis for education, not legal or financial advice. Not affiliated with the CFPB.
