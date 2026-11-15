# %% [markdown]
# # 03 · Gold tables with SQL
#
# **What this notebook does:** turns the cleaned tables into small, ready-to-use **gold** tables: one per question
# a manager might ask. The AI/BI dashboard and the Genie space read only these tables, so their numbers always agree.
#
# Every query here uses plain SQL that runs on both Databricks (Spark SQL) and DuckDB.
#
# **One thing to remember:** the archive stops on 14 August 2026, so August 2026 is a partial month.
# Monthly trends stop at July 2026.

# %%
from radar import setup, run_sql
setup()

# %% [markdown]
# ### Complaints per month and product
# This counts all complaints, with or without a narrative. It drives the main trend chart.

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_monthly AS
    SELECT month, product, SUM(complaints) AS complaints
    FROM monthly_counts
    WHERE month < '2026-08-01'                         -- August 2026 is only half a month
    GROUP BY month, product
""")
data = run_sql("SELECT month, SUM(complaints) AS complaints FROM gold_monthly GROUP BY month ORDER BY month")
data.tail(6)

# %% [markdown]
# ### Each product's share of all complaints

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_products AS
    SELECT product,
           SUM(complaints) AS complaints,
           ROUND(100.0 * SUM(complaints) / (SELECT SUM(complaints) FROM gold_monthly), 2) AS share_pct
    FROM gold_monthly
    GROUP BY product
""")
data = run_sql("SELECT * FROM gold_products ORDER BY complaints DESC")
data

# %% [markdown]
# ### Top issues inside each product
# `issue` is what the customer picked from the CFPB form, like "Incorrect information on your report".
# We keep the top 8 per product, ranked with a window function.

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_issues AS
    WITH counted AS (
        SELECT product, issue, SUM(complaints) AS complaints
        FROM monthly_counts
        WHERE month < '2026-08-01' AND issue IS NOT NULL
        GROUP BY product, issue
    ), ranked AS (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY product ORDER BY complaints DESC) AS rank_in_product,
               ROUND(100.0 * complaints / SUM(complaints) OVER (PARTITION BY product), 2) AS share_of_product_pct
        FROM counted
    )
    SELECT * FROM ranked WHERE rank_in_product <= 8
""")
data = run_sql("SELECT * FROM gold_issues WHERE product = 'Credit card' ORDER BY rank_in_product")
data

# %% [markdown]
# ### How companies respond
# For each company with at least 500 complaints:
# * **timely %**: share of complaints answered within the CFPB's 15-day window
# * **relief %**: share closed with money back or another fix ("monetary" or "non-monetary relief")
# * **explanation only %**: share closed with just an explanation
#
# These are complaint patterns, not a verdict on any company: big companies get more complaints simply because
# they have more customers.

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_companies AS
    SELECT company,
           SUM(complaints) AS complaints,
           ROUND(100.0 * SUM(CASE WHEN timely = 'Yes' THEN complaints ELSE 0 END) / SUM(complaints), 1) AS timely_pct,
           ROUND(100.0 * SUM(CASE WHEN company_response IN ('Closed with monetary relief', 'Closed with non-monetary relief')
                                  THEN complaints ELSE 0 END) / SUM(complaints), 1) AS relief_pct,
           ROUND(100.0 * SUM(CASE WHEN company_response = 'Closed with explanation' THEN complaints ELSE 0 END) / SUM(complaints), 1) AS explanation_pct,
           ROUND(100.0 * SUM(CASE WHEN company_response = 'In progress' THEN complaints ELSE 0 END) / SUM(complaints), 1) AS in_progress_pct
    FROM company_counts
    GROUP BY company
    HAVING SUM(complaints) >= 500
""")
data = run_sql("SELECT * FROM gold_companies ORDER BY complaints DESC LIMIT 15")
data

# %% [markdown]
# ### Which product each company's complaints are about

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_company_products AS
    SELECT c.company, c.product, SUM(c.complaints) AS complaints
    FROM company_counts c
    JOIN gold_companies g ON g.company = c.company          -- only companies big enough to be in the scorecard
    GROUP BY c.company, c.product
""")
data = run_sql("SELECT COUNT(DISTINCT company) AS companies, COUNT(*) AS rows_ FROM gold_company_products")
data

# %% [markdown]
# ### How responses differ by product

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_responses AS
    SELECT product, company_response, SUM(complaints) AS complaints,
           ROUND(100.0 * SUM(complaints) / SUM(SUM(complaints)) OVER (PARTITION BY product), 2) AS share_of_product_pct
    FROM company_counts
    WHERE company_response IS NOT NULL
    GROUP BY product, company_response
""")
data = run_sql("SELECT * FROM gold_responses WHERE product = 'Bank account' ORDER BY complaints DESC")
data

# %% [markdown]
# ### Fastest-growing issues
# Compares the last three full months (May to July 2026) with the same three months in 2025.
# Only issues with at least 300 complaints in both periods, so tiny numbers don't look like huge jumps.

# %%
run_sql("""
    CREATE OR REPLACE TABLE gold_issue_growth AS
    WITH periods AS (
        SELECT product, issue,
               SUM(CASE WHEN month >= '2026-05-01' AND month < '2026-08-01' THEN complaints ELSE 0 END) AS recent,
               SUM(CASE WHEN month >= '2025-05-01' AND month < '2025-08-01' THEN complaints ELSE 0 END) AS year_ago
        FROM monthly_counts
        WHERE issue IS NOT NULL
        GROUP BY product, issue
    )
    SELECT product, issue, recent, year_ago,
           ROUND(100.0 * (recent - year_ago) / year_ago, 1) AS change_pct
    FROM periods
    WHERE recent >= 300 AND year_ago >= 300
""")
data = run_sql("SELECT * FROM gold_issue_growth ORDER BY change_pct DESC LIMIT 10")
data
