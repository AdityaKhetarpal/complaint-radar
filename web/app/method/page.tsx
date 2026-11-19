import type { Metadata } from "next";
import { overview, n, dateName, monthName } from "@/lib/data";

export const metadata: Metadata = { title: "How it's built", description: "The Databricks lakehouse behind Complaint Radar: Unity Catalog tables, MLflow, Genie, AI/BI and the GitHub Actions pipeline." };

const REPO = "https://github.com/AdityaKhetarpal/complaint-radar";

export default function Method() {
  const h = overview.headline;
  return (
    <div className="wrap">
      <div className="head">
        <div className="label">Databricks · Unity Catalog · MLflow · Genie · AI/BI</div>
        <h1>How it&apos;s built</h1>
        <p>Seven notebooks run the whole project. The same notebooks run in a Databricks workspace and in GitHub Actions, which is how this website gets its numbers.</p>
      </div>

      <section className="section" data-reveal>
        <h2>The pipeline</h2>
        <div className="flow" style={{ marginTop: 16 }}>
          <div><b>01 Acquire</b>Download the CFPB archive, keep 2025 to 2026, sample {n(h.sample)} letters, count all {n(h.complaints)} complaints.</div>
          <div><b>02 Load and clean</b>Short product names, remove the CFPB&apos;s privacy masks, save tables to Unity Catalog.</div>
          <div><b>03 SQL gold tables</b>Trends, issues, company responses, growth: the tables Genie and the dashboard read.</div>
          <div><b>04 Routing model</b>Baseline plus three TF-IDF classifiers, logged in MLflow; the best is registered in Unity Catalog.</div>
          <div><b>05 Topics</b>NMF topic modeling finds themes in the letters and tracks them by month.</div>
          <div><b>06 GenAI</b>LLM names the themes, is tested against the classifier, and answers questions with checked citations.</div>
          <div><b>07 Export</b>Writes the small JSON files this website reads.</div>
          <div><b>Website</b>Next.js on Vercel. No database and no API keys: every number is precomputed.</div>
        </div>
        <p className="source">Notebooks: <a href={`${REPO}/tree/main/notebooks`}>notebooks/</a>. Each one explains every step in plain words before the code.</p>
      </section>

      <section className="section grid g2" data-reveal>
        <div className="card">
          <h3>On Databricks</h3>
          <ul>
            <li>Tables in <b>Unity Catalog</b> under <code>workspace.complaint_radar</code></li>
            <li>SQL on <b>Spark</b>; Python with pandas and scikit-learn on serverless compute</li>
            <li>Every model run in <b>MLflow</b>; the router registered as <code>complaint_router</code></li>
            <li>LLM steps call a <b>Foundation Model endpoint</b> through <code>ai_query()</code></li>
            <li>A <b>Genie space</b> and an <b>AI/BI dashboard</b> on the gold tables</li>
          </ul>
        </div>
        <div className="card">
          <h3>In GitHub Actions (for this website)</h3>
          <ul>
            <li>The same notebooks, with a <b>DuckDB</b> file standing in for Unity Catalog</li>
            <li>MLflow tracking to a local file</li>
            <li>LLM steps run <b>{h.llm}</b> on the CPU: free and no API key</li>
            <li>Notebooks are committed with their outputs, so you can read every result on GitHub</li>
          </ul>
        </div>
      </section>

      <section className="section" data-reveal>
        <h2>Run it in your own Databricks workspace</h2>
        <p className="sub">Works on the free <a href="https://docs.databricks.com/aws/en/getting-started/free-edition">Databricks Free Edition</a>. About 15 minutes.</p>
        <ol className="steps" style={{ marginTop: 16 }}>
          <li><span><b>Add the repo.</b> Workspace → Create → Git folder → paste <code>{REPO}</code>. The data files come with it, because Free Edition can&apos;t download from most websites.</span></li>
          <li><span><b>Run notebooks 02 to 07</b> in order, on serverless compute. Skip 01: its output is already in <code>data/</code>.</span></li>
          <li><span><b>Check the tables</b> in Catalog → workspace → complaint_radar, and the runs in Experiments → complaint-radar.</span></li>
          <li><span><b>Create a Genie space</b> on the gold tables. Paste the instructions from <a href={`${REPO}/blob/main/genie/instructions.md`}><code>genie/instructions.md</code></a> and add the trusted queries from <a href={`${REPO}/blob/main/genie/trusted_queries.sql`}><code>genie/trusted_queries.sql</code></a>.</span></li>
          <li><span><b>Build the AI/BI dashboard</b> from the same gold tables: a monthly trend line from <code>gold_monthly</code>, product shares from <code>gold_products</code>, the company table from <code>gold_companies</code>.</span></li>
        </ol>
      </section>

      <section className="section" data-reveal>
        <h2>Data and limits</h2>
        <ul>
          <li><b>Source:</b> the CFPB Consumer Complaint Database <a href="https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/">narratives archive</a>, complaints received {monthName(h.first_month)} to {dateName(h.archive_cutoff)}. US government data in the public domain.</li>
          <li><b>Why an archive:</b> in August 2026 the CFPB stopped publishing complaint narratives and moved everything published before 14 August 2026 to this archive. Newer complaints have no narrative, so the text analysis can&apos;t be extended past that date.</li>
          <li><b>Counts are of complaints, not problems:</b> the CFPB does not verify every complaint, and big companies get more complaints because they have more customers.</li>
          <li><b>The sample is balanced</b> (at most 4,000 letters per product), so topic shares describe what letters talk about, not how common each product is.</li>
          <li><b>The labels are the customer&apos;s own choice of product</b>, which is sometimes wrong or ambiguous, so the model&apos;s true accuracy is a little higher than measured.</li>
          <li><b>Knowledge Assistant:</b> Databricks&apos; ready-made Agent Bricks assistant isn&apos;t available on Free Edition, so the complaints assistant is built by hand in notebook 06 (retrieval plus an LLM, with citation checks).</li>
        </ul>
      </section>
    </div>
  );
}
