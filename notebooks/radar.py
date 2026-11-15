"""Small helpers shared by every notebook.

The same notebooks run in two places:
  * Databricks  -> tables live in Unity Catalog (workspace.complaint_radar), SQL runs on Spark, runs are tracked in MLflow
  * your laptop / GitHub Actions -> tables live in a DuckDB file, SQL runs on DuckDB, MLflow writes to a local folder

Each notebook only calls save_table(), run_sql() and the paths below, so it never has to care where it is running.
"""
import os
from pathlib import Path

import pandas as pd

ON_DATABRICKS = "DATABRICKS_RUNTIME_VERSION" in os.environ   # Databricks sets this on every cluster / serverless notebook

ROOT = Path(__file__).resolve().parent.parent           # the repo folder (works in a Databricks Git folder too)
DATA = ROOT / "data"                                    # small files that are committed to the repo
RAW = DATA / "raw"                                      # big downloads, never committed
EXPORT = ROOT / "web" / "public" / "data"               # JSON files the website reads

CATALOG = "workspace"                                   # the default catalog in Databricks Free Edition
SCHEMA = "complaint_radar"                              # our schema (a folder of tables)
DUCKDB_FILE = DATA / "complaint_radar.duckdb"           # local stand-in for Unity Catalog

_con = None


def _spark():
    from databricks.sdk.runtime import spark  # only importable on Databricks
    return spark


def _duck():
    global _con
    if _con is None:
        import duckdb
        _con = duckdb.connect(str(DUCKDB_FILE))
    return _con


def setup():
    """Create the schema (Databricks) or the DuckDB file (local) and say where we are."""
    DATA.mkdir(exist_ok=True)
    if ON_DATABRICKS:
        spark = _spark()
        spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
        spark.sql(f"USE CATALOG {CATALOG}")
        spark.sql(f"USE SCHEMA {SCHEMA}")
        return f"Databricks: tables go to {CATALOG}.{SCHEMA}"
    _duck()
    return f"Local: tables go to {DUCKDB_FILE.relative_to(ROOT)}"


def save_table(data: pd.DataFrame, name: str) -> str:
    """Save a pandas DataFrame as a table (replaces it if it exists)."""
    if ON_DATABRICKS:
        _spark().createDataFrame(data).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{CATALOG}.{SCHEMA}.{name}")
        return f"{CATALOG}.{SCHEMA}.{name}: {len(data):,} rows"
    con = _duck()
    con.register("_frame", data)
    con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM _frame")
    con.unregister("_frame")
    return f"{name}: {len(data):,} rows"


def run_sql(query: str) -> pd.DataFrame:
    """Run SQL and return the result as a pandas DataFrame. The queries in this project use SQL that both engines understand."""
    if ON_DATABRICKS:
        return _spark().sql(query).toPandas()
    return _duck().execute(query).df()


def mlflow_setup(name: str = "complaint-radar"):
    """Point MLflow at the Databricks workspace or at a local folder, and pick the experiment."""
    import mlflow
    if ON_DATABRICKS:
        user = _spark().sql("SELECT current_user() AS u").first().u
        mlflow.set_registry_uri("databricks-uc")                 # register models in Unity Catalog
        mlflow.set_experiment(f"/Users/{user}/{name}")
    else:
        mlflow.set_tracking_uri(f"sqlite:///{(ROOT / 'mlruns.db').as_posix()}")   # a local database file, ignored by git
        mlflow.set_experiment(name)
    return mlflow


def llm(prompt: str, max_tokens: int = 300) -> str:
    """Ask a language model. On Databricks this uses a pay-per-token Foundation Model endpoint through ai_query();
    locally it runs a small open model (Qwen2.5) on the CPU, so no API key is ever needed."""
    if os.environ.get("RADAR_FAKE_LLM"):                       # used only by the code tests, never for real results
        return '{"name": "Test theme", "summary": "Test summary."} Credit card [%s]' % os.environ.get("RADAR_FAKE_ID", "1")
    if ON_DATABRICKS:
        model = os.environ.get("RADAR_LLM_ENDPOINT", "databricks-meta-llama-3-3-70b-instruct")
        safe = prompt.replace("'", "''")                        # escape quotes for SQL
        out = _spark().sql(f"SELECT ai_query('{model}', '{safe}', modelParameters => named_struct('max_tokens', {max_tokens}, 'temperature', 0.0)) AS a")
        return out.first().a.strip()
    return _cached_llm(prompt, max_tokens)


LLM_CACHE = ROOT / "data" / "llm_cache.json"   # saved answers, so a rerun only asks the prompts that changed


def _cached_llm(prompt: str, max_tokens: int) -> str:
    import hashlib, json
    cache = json.loads(LLM_CACHE.read_text()) if LLM_CACHE.exists() else {}
    key = hashlib.md5(f"{LOCAL_MODEL}|{max_tokens}|{prompt}".encode()).hexdigest()
    if key not in cache:
        cache[key] = _local_llm(prompt, max_tokens)              # greedy decoding, so the same prompt gives the same answer
        LLM_CACHE.write_text(json.dumps(cache, indent=0))
    return cache[key]


_local = {}
LOCAL_MODEL = os.environ.get("RADAR_LOCAL_MODEL", "Qwen/Qwen2.5-3B-Instruct")


def _local_llm(prompt: str, max_tokens: int) -> str:
    if "pipe" not in _local:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        torch.set_num_threads(os.cpu_count() or 4)             # use every CPU core
        tok = AutoTokenizer.from_pretrained(LOCAL_MODEL)
        # float32: most CPUs have no fast bfloat16 maths, so the model's default bfloat16 is many times slower
        model = AutoModelForCausalLM.from_pretrained(LOCAL_MODEL, torch_dtype=torch.float32)
        model.eval()
        _local["pipe"] = (tok, model)
    tok, model = _local["pipe"]
    import torch
    text = tok.apply_chat_template([{"role": "user", "content": prompt}], tokenize=False, add_generation_prompt=True)
    ids = tok(text, return_tensors="pt")
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=max_tokens, do_sample=False)
    return tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()


def llm_name() -> str:
    if ON_DATABRICKS:
        return os.environ.get("RADAR_LLM_ENDPOINT", "databricks-meta-llama-3-3-70b-instruct")
    return LOCAL_MODEL
