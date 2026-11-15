import Link from "next/link";
import Vanta from "@/components/Vanta";
import LineChart from "@/components/LineChart";
import Bars from "@/components/Bars";
import IssueExplorer from "@/components/IssueExplorer";
import { overview, model, topics, compact, n, pct, monthName, modelLabel } from "@/lib/data";

export default function Home() {
  const { headline: h, monthly, products, issues, growth } = overview;
  const months = [...new Set(monthly.map((m) => m.month))].sort();
  const total = months.map((m) => monthly.filter((r) => r.month === m).reduce((s, r) => s + r.complaints, 0));
  const topProducts = products.slice(0, 5).map((p) => p.product);
  const series = [
    { name: "All products", values: total },
    ...topProducts.map((p) => ({ name: p, values: months.map((m) => monthly.find((r) => r.month === m && r.product === p)?.complaints ?? 0) })),
  ];
  const first = total[0], last = total[total.length - 1];
  const best = model.scores[0];
  const named = topics.topics.filter((t) => t.name);

  return (
    <>
      <section className="hero">
        <Vanta />
        <div className="wrap">
          <div className="kicker">A Databricks lakehouse project · US consumer finance complaints</div>
          <h1>What bank customers complain about, and where each complaint should go</h1>
          <p className="lead">
            {compact(h.complaints)} complaints sent to the US Consumer Financial Protection Bureau between {monthName(h.first_month)} and
            mid-August 2026, turned into trends, themes nobody had a label for, and a model that reads a complaint and routes it to the
            right team.
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn" href="/routing">See the routing model</Link>
            <Link className="btn ghost" href="/method">How it&apos;s built on Databricks</Link>
          </div>
          <div className="stats">
            <div className="stat"><b>{compact(h.complaints)}</b><span>complaints, {monthName(h.first_month)} to {monthName(h.last_month)}</span></div>
            <div className="stat"><b>{pct(100 * best.macro_f1, 1)}</b><span>macro F1 routing complaints to 1 of {new Set(model.confusion.map((c) => c.actual)).size} products ({modelLabel[best.model] ?? best.model})</span></div>
            <div className="stat"><b>{named.length || topics.topics.length}</b><span>themes found by topic modeling in {n(h.sample)} complaint letters</span></div>
            <div className="stat"><b>{h.companies_scored}</b><span>companies with 500+ complaints compared on how they respond</span></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section" style={{ paddingTop: 40 }} data-reveal>
          <h2>Complaints per month</h2>
          <p className="answer-line">
            Monthly complaints went from <b>{n(first)}</b> in {monthName(months[0])} to <b>{n(last)}</b> in {monthName(months[months.length - 1])}
            {" "}({last >= first ? "+" : ""}{pct((100 * (last - first)) / first, 0)}).
          </p>
          <div className="card">
            <LineChart months={months} series={series} kind="compact" yLabel="Complaints" />
            <p className="source">All complaints in the archive, with or without a written narrative. August 2026 is left out because the archive stops on 14 August. Source: CFPB.</p>
          </div>
        </section>

        <section className="section grid g2" data-reveal>
          <div className="card">
            <h3>Share of complaints by product</h3>
            <p className="sub">{products[0].product} alone is {pct(products[0].share_pct)} of all complaints.</p>
            <Bars rows={products.map((p) => ({ label: p.product, value: p.share_pct }))} format={(v) => pct(v)} highlight={[products[0].product]} />
            <p className="source">{monthName(h.first_month)} to July 2026, all complaints. Source: CFPB.</p>
          </div>
          <div className="card">
            <h3>Top issues inside a product</h3>
            <p className="sub">What customers picked on the CFPB form, as a share of that product&apos;s complaints.</p>
            <IssueExplorer issues={issues} products={products.map((p) => p.product)} />
            <p className="source">{monthName(h.first_month)} to July 2026, all complaints. Source: CFPB.</p>
          </div>
        </section>

        {growth.length > 0 && (
          <section className="section" data-reveal>
            <h2>Fastest-growing issues</h2>
            <p className="sub">May to July 2026 compared with May to July 2025. Only issues with at least 300 complaints in both periods.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Issue</th><th className="num">May–Jul 2025</th><th className="num">May–Jul 2026</th><th className="num">Change</th></tr></thead>
                <tbody>
                  {growth.slice(0, 10).map((g) => (
                    <tr key={g.product + g.issue}>
                      <td>{g.product}</td><td>{g.issue}</td>
                      <td className="num">{n(g.year_ago)}</td><td className="num">{n(g.recent)}</td>
                      <td className="num" style={{ color: g.change_pct >= 0 ? "var(--accent)" : "var(--good)", fontWeight: 600 }}>{g.change_pct >= 0 ? "+" : ""}{pct(g.change_pct, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="source">Source: CFPB, all complaints. Computed in notebook 03 (gold_issue_growth).</p>
          </section>
        )}

        <section className="section" data-reveal>
          <h2>What&apos;s inside</h2>
          <div className="grid g3">
            <Link href="/themes" className="card" style={{ textDecoration: "none" }}><h3>Themes</h3><p className="sub">Topic modeling finds what complaints are really about, then an LLM names and summarises each theme.</p></Link>
            <Link href="/routing" className="card" style={{ textDecoration: "none" }}><h3>Routing model</h3><p className="sub">Three text classifiers tracked in MLflow, compared with a baseline and with an LLM that had no training.</p></Link>
            <Link href="/assistant" className="card" style={{ textDecoration: "none" }}><h3>Complaints assistant</h3><p className="sub">Ask a question, get an answer built only from real complaints, with every citation checked.</p></Link>
          </div>
        </section>
      </div>
    </>
  );
}
