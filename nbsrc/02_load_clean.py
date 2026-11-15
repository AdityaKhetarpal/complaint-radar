# %% [markdown]
# # 02 · Load and clean
#
# **What this notebook does:** loads the three files from notebook 01, cleans them, and saves them as tables.
# On Databricks the tables go to Unity Catalog (`workspace.complaint_radar`); locally they go to a DuckDB file.
# Every later notebook reads these tables, never the raw files.

# %% [markdown]
# ### Connect
# `setup()` creates the schema on Databricks, or opens the local DuckDB file.

# %%
from radar import setup, save_table, run_sql, DATA
setup()

# %% [markdown]
# ### Load the sample of complaints with narratives

# %%
import pandas as pd
data = pd.read_parquet(DATA / "complaints_sample.parquet")
print(f"{len(data):,} complaints, {data['date_received'].min():%d %b %Y} to {data['date_received'].max():%d %b %Y}")
data.head(3)

# %% [markdown]
# ### Shorter product names
# The CFPB's product names are long ("Payday loan, title loan, personal loan, or advance loan"). Charts and model
# labels are easier to read with short names. Anything not in the list keeps its original name.

# %%
SHORT = {
    "Credit reporting or other personal consumer reports": "Credit reporting",
    "Credit reporting, credit repair services, or other personal consumer reports": "Credit reporting",
    "Debt collection": "Debt collection",
    "Checking or savings account": "Bank account",
    "Credit card": "Credit card",
    "Credit card or prepaid card": "Credit card",
    "Prepaid card": "Prepaid card",
    "Money transfer, virtual currency, or money service": "Money transfer",
    "Mortgage": "Mortgage",
    "Vehicle loan or lease": "Vehicle loan",
    "Student loan": "Student loan",
    "Payday loan, title loan, personal loan, or advance loan": "Personal loan",
    "Payday loan, title loan, or personal loan": "Personal loan",
    "Debt or credit management": "Debt management",
}
data["product_full"] = data["product"]                               # keep the original name too
data["product"] = data["product"].map(SHORT).fillna(data["product"])
data["product"].value_counts()

# %% [markdown]
# ### Clean the text for the models
# The CFPB hides personal details before publishing: names become `XXXX`, dates become `XX/XX/2025`, amounts
# become `{$500.00}`. Those masks carry no meaning, so we remove them from the copy the models read.
# The original narrative stays untouched for display.

# %%
import re

def clean(text: str) -> str:
    text = re.sub(r"X{2,}", " ", text)                    # XXXX masks
    text = re.sub(r"\{\$[\d,\.]+\}", " amount ", text)     # {$500.00} -> "amount"
    text = re.sub(r"[^A-Za-z' ]+", " ", text)              # drop numbers and punctuation
    return re.sub(r"\s+", " ", text).strip().lower()

data["text"] = data["narrative"].fillna("").map(clean)
data["words"] = data["text"].str.split().str.len()         # length of each complaint in words
data["words"].describe().round(0)

# %% [markdown]
# ### Drop complaints too short to learn from
# A handful of narratives are just a few words ("see attached"). Under 20 words there is nothing to classify.

# %%
before = len(data)
data = data[data["words"] >= 20].reset_index(drop=True)
print(f"dropped {before - len(data):,} very short complaints, {len(data):,} left")

# %% [markdown]
# ### Save the complaints table

# %%
data["date_received"] = pd.to_datetime(data["date_received"])
save_table(data, "complaints")

# %% [markdown]
# ### Load and save the counts over all complaints
# These include complaints without a narrative, so the trends reflect the whole database, not just our sample.

# %%
data = pd.read_parquet(DATA / "complaints_monthly.parquet")
data["product"] = data["product"].map(SHORT).fillna(data["product"])
data = data.groupby(["month", "product", "issue", "has_narrative"], dropna=False)["complaints"].sum().reset_index()
save_table(data, "monthly_counts")

# %%
data = pd.read_parquet(DATA / "companies.parquet")
data["product"] = data["product"].map(SHORT).fillna(data["product"])
data = data.groupby(["company", "product", "company_response", "timely"], dropna=False)["complaints"].sum().reset_index()
save_table(data, "company_counts")

# %% [markdown]
# ### Check the tables
# A quick count from each table, using SQL, to make sure everything landed.

# %%
data = run_sql("""
    SELECT 'complaints' AS table_name, COUNT(*) AS rows_ FROM complaints
    UNION ALL SELECT 'monthly_counts', COUNT(*) FROM monthly_counts
    UNION ALL SELECT 'company_counts', COUNT(*) FROM company_counts
""")
data
