-- Trusted queries for the Genie space. Each block starts with "-- Q: " and the question in plain English.
-- In Genie: Configure > Instructions > SQL queries > Add, paste the question as the title and the SQL below it.
-- They run on the gold tables in workspace.complaint_radar (and on DuckDB, for the website).

-- Q: Which products got the most complaints in January to July 2026?
SELECT product, SUM(complaints) AS complaints
FROM gold_monthly
WHERE month >= '2026-01-01'
GROUP BY product
ORDER BY complaints DESC;

-- Q: How many complaints were there in January to July 2026 compared with the same months of 2025?
SELECT YEAR(month) AS year, SUM(complaints) AS complaints
FROM gold_monthly
WHERE MONTH(month) <= 7
GROUP BY YEAR(month)
ORDER BY year;

-- Q: Which 10 companies received the most complaints, and how often did they respond on time?
SELECT company, complaints, timely_pct
FROM gold_companies
ORDER BY complaints DESC
LIMIT 10;

-- Q: Among companies with at least 2,000 complaints, which closed the most complaints with relief for the customer?
SELECT company, complaints, relief_pct, explanation_pct
FROM gold_companies
WHERE complaints >= 2000
ORDER BY relief_pct DESC
LIMIT 10;

-- Q: What are the top issues in credit card complaints?
SELECT issue, complaints, share_of_product_pct
FROM gold_issues
WHERE product = 'Credit card'
ORDER BY rank_in_product;

-- Q: Which issues grew the most compared with a year ago?
SELECT product, issue, year_ago, recent, change_pct
FROM gold_issue_growth
ORDER BY change_pct DESC
LIMIT 10;

-- Q: How are bank account complaints usually closed?
SELECT company_response, complaints, share_of_product_pct
FROM gold_responses
WHERE product = 'Bank account'
ORDER BY complaints DESC;
