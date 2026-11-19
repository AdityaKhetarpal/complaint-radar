import type { Metadata } from "next";
import { ask } from "@/lib/data";

export const metadata: Metadata = { title: "Ask the data", description: "Plain-English questions answered with SQL over the gold tables, the same trusted queries used in the Databricks Genie space." };

const fmt = (v: string | number | null, col: string) =>
  v == null ? "–" : col === "year" ? String(v) : typeof v === "number" ? (Number.isInteger(v) || Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)) : v;

export default function Ask() {
  return (
    <div className="wrap">
      <div className="head">
        <div className="kicker">Databricks Genie · trusted SQL queries · gold tables</div>
        <h1>Ask the data in plain English</h1>
        <p>
          In Databricks, a <b>Genie space</b> lets a manager type a question and get a table or chart back: Genie writes the SQL. To keep it accurate, a Genie
          space is given instructions and a set of <b>trusted queries</b>: questions paired with SQL a person has checked. These are this project&apos;s trusted
          queries, run on the same gold tables, with their real results.
        </p>
      </div>
      <div className="callout" style={{ marginBottom: 32 }}>
        Genie itself runs inside a Databricks workspace, so it can&apos;t be embedded on a public website. The <a href="/method">How it&apos;s built</a> page shows how to set
        it up in a few minutes with the files in <a href="https://github.com/AdityaKhetarpal/complaint-radar/tree/main/genie"><code>genie/</code></a>.
      </div>
      {ask.examples.map((e) => {
        const cols = e.result.length ? Object.keys(e.result[0]) : [];
        return (
          <section key={e.question} className="section" data-reveal>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>{e.question}</h3>
            <div className="grid g2" style={{ alignItems: "start" }}>
              <pre className="sql">{e.sql}</pre>
              <div className="table-wrap">
                <table>
                  <thead><tr>{cols.map((c) => <th key={c} className={typeof e.result[0][c] === "number" ? "num" : undefined}>{c.replace(/_/g, " ")}</th>)}</tr></thead>
                  <tbody>
                    {e.result.slice(0, 12).map((r, i) => (
                      <tr key={i}>{cols.map((c) => <td key={c} className={typeof r[c] === "number" ? "num" : undefined}>{fmt(r[c], c)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
