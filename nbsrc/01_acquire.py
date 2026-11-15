# %% [markdown]
# # 01 · Get the complaints
#
# **What this notebook does:** downloads the US Consumer Financial Protection Bureau (CFPB) complaint archive,
# keeps complaints received from January 2025 onwards, and saves two small files the other notebooks use:
#
# * `data/complaints_sample.parquet`: a sample of complaints **with the customer's own words** (the narrative)
# * `data/complaints_monthly.parquet` and `data/companies.parquet`: counts over **all** complaints, for the trends
#
# **Why an archive?** In August 2026 the CFPB stopped publishing complaint narratives. Everything published up to
# 14 August 2026 was moved to a public archive in its FOIA reading room. That archive is our source.
#
# **Where it runs:** on your laptop or in GitHub Actions. Databricks Free Edition can only reach a short list of
# websites, so on Databricks you skip this notebook and use the files already in the repo.

# %% [markdown]
# ### Settings
# The archive is split into ZIP files by date. We take the ones that cover January 2025 to August 2026.

# %%
from radar import ON_DATABRICKS, DATA, RAW   # paths shared by every notebook

BASE = "https://files.consumerfinance.gov/f/documents/"      # where the CFPB keeps the archive files
FILES = [
    "CCDB_Export_9_January_2025_through_February_2025.zip",
    "CCDB_Export_10_March_2025_through_April_2025.zip",
    "CCDB_Export_11_May_2025_through_June_2025.zip",
    "CCDB_Export_12_July_2025_through_August_2025.zip",
    "CCDB_Export_13_September_2025_through_October_2025.zip",
    "CCDB_Export_14_November_2025_through_December_2025.zip",
    "CCDB_Export_15_January_2026_through_February_2026.zip",
    "CCDB_Export_16_March_2026.zip",
    "CCDB_Export_17_April_2026.zip",
    "CCDB_Export_18_May_2026.zip",
    "CCDB_Export_19_June_2026.zip",
    "CCDB_Export_20_July_2026.zip",
    "CCDB_Export_21_August_2026.zip",
]
SAMPLE_RATE = 0.10        # keep about 1 in 10 complaints that have a narrative
PER_PRODUCT = 4000        # then at most this many per product, so one product can't swamp the rest

if ON_DATABRICKS:
    print("On Databricks: skip this notebook. The repo already has the files it makes.")

# %% [markdown]
# ### Download the ZIP files
# Each file is downloaded once into `data/raw/` (that folder is not committed to git).

# %%
import requests   # downloads files over HTTP

RAW.mkdir(parents=True, exist_ok=True)
for name in FILES:
    target = RAW / name
    if target.exists() and target.stat().st_size > 0:
        continue                                                     # already downloaded
    with requests.get(BASE + name, stream=True, timeout=300) as r:
        r.raise_for_status()                                         # stop if the file is missing
        with open(target, "wb") as f:
            for block in r.iter_content(1 << 20):                    # 1 MB at a time, so memory stays low
                f.write(block)
    print(f"{name}: {target.stat().st_size / 1e6:,.0f} MB")

# %% [markdown]
# ### Look inside one file
# Before reading millions of rows, check the column names so the code below asks for the right ones.

# %%
import zipfile
import pandas as pd

with zipfile.ZipFile(RAW / FILES[0]) as z:
    inner = [n for n in z.namelist() if n.lower().endswith(".csv")]
    print(inner)
    data = pd.read_csv(z.open(inner[0]), nrows=5, dtype=str)
data.columns.tolist()

# %% [markdown]
# ### Read every file in chunks
# The files are too big to load at once, so we read 200,000 rows at a time and, from each chunk, keep:
#
# 1. **counts** of all complaints by month, product and issue (for the trend charts)
# 2. **counts** by company and how the company responded
# 3. a **random sample** of complaints that have a narrative
#
# The sample is "random" but repeatable: a complaint is kept when a hash of its ID falls under 10%, so running
# the notebook again keeps exactly the same complaints.

# %%
import hashlib

COLUMNS = {                                   # archive column name -> our short name
    "Date received": "date_received",
    "Product": "product",
    "Sub-product": "sub_product",
    "Issue": "issue",
    "Sub-issue": "sub_issue",
    "Consumer complaint narrative": "narrative",
    "Company": "company",
    "State": "state",
    "Submitted via": "submitted_via",
    "Company response to consumer": "company_response",
    "Timely response?": "timely",
    "Complaint ID": "complaint_id",
}

def keep(complaint_id: str) -> bool:
    """Repeatable coin flip: True for about SAMPLE_RATE of all IDs."""
    h = int(hashlib.md5(str(complaint_id).encode()).hexdigest()[:8], 16)
    return h / 0xFFFFFFFF < SAMPLE_RATE

monthly, companies, samples, seen = [], [], [], set()
for name in FILES:
    with zipfile.ZipFile(RAW / name) as z:
        inner = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
        for chunk in pd.read_csv(z.open(inner), dtype=str, chunksize=200_000, usecols=lambda c: c in COLUMNS):
            chunk = chunk.rename(columns=COLUMNS)
            chunk = chunk[~chunk["complaint_id"].isin(seen)]                       # the files can overlap at the edges
            seen.update(chunk["complaint_id"])
            chunk["date_received"] = pd.to_datetime(chunk["date_received"], errors="coerce")
            chunk = chunk[chunk["date_received"] >= "2025-01-01"]
            chunk["month"] = chunk["date_received"].dt.to_period("M").dt.to_timestamp()
            chunk["has_narrative"] = chunk["narrative"].fillna("").str.len() > 0
            monthly.append(chunk.groupby(["month", "product", "issue", "has_narrative"], dropna=False).size().rename("complaints").reset_index())
            companies.append(chunk.groupby(["company", "product", "company_response", "timely"], dropna=False).size().rename("complaints").reset_index())
            with_text = chunk[chunk["has_narrative"]]
            samples.append(with_text[with_text["complaint_id"].map(keep)])
    print(f"{name}: {len(seen):,} complaints so far")

# %% [markdown]
# ### Add the chunks up
# Each chunk gave partial counts; summing them by the same columns gives the totals.

# %%
data = pd.concat(monthly).groupby(["month", "product", "issue", "has_narrative"], dropna=False)["complaints"].sum().reset_index()
data.to_parquet(DATA / "complaints_monthly.parquet", index=False)
print(f"{data['complaints'].sum():,} complaints from {data['month'].min():%b %Y} to {data['month'].max():%b %Y}")
data.groupby("month")["complaints"].sum().tail()

# %%
data = pd.concat(companies).groupby(["company", "product", "company_response", "timely"], dropna=False)["complaints"].sum().reset_index()
data.to_parquet(DATA / "companies.parquet", index=False)
data.groupby("company")["complaints"].sum().sort_values(ascending=False).head(10)

# %% [markdown]
# ### Balance the sample
# Credit reporting complaints are most of the database. If we kept them all, every model would mostly learn
# about credit reports. So we keep at most 4,000 complaints per product, picked by the same repeatable hash.

# %%
data = pd.concat(samples, ignore_index=True)
data["pick"] = data["complaint_id"].map(lambda i: hashlib.md5(f"pick-{i}".encode()).hexdigest())   # a repeatable shuffle
data = data.sort_values("pick").groupby("product", group_keys=False).head(PER_PRODUCT).drop(columns="pick")
data = data.drop(columns=["has_narrative"]).sort_values("date_received").reset_index(drop=True)
data["product"].value_counts()

# %% [markdown]
# ### Save the sample
# Parquet keeps the column types and compresses the text well, so the file is small enough to commit.

# %%
data.to_parquet(DATA / "complaints_sample.parquet", index=False, compression="zstd")
print(f"{len(data):,} complaints with a narrative · {(DATA / 'complaints_sample.parquet').stat().st_size / 1e6:.1f} MB")
