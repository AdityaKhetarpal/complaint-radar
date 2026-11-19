import Link from "next/link";
import Vanta from "@/components/Vanta";
import Radar from "@/components/Radar";
import LineChart from "@/components/LineChart";
import Bars from "@/components/Bars";
import IssueExplorer from "@/components/IssueExplorer";
import { LINKS } from "@/lib/links";
import { overview, model, topics, compact, n, pct, monthName, modelLabel } from "@/lib/data";

// one line for each page in the closing index
const ABOUT: Record<string, string> = {
  "/themes": "Topic modeling finds what the letters are really about; an LLM names and summarises each theme.",
  "/routing": "Three text classifiers tracked in MLflow, against a baseline and an LLM with no training.",
  "/companies": "How the biggest companies close their complaints: on time, with relief, or with an explanation only.",
  "/assistant": "Questions answered only from real complaints, with every citation checked.",
  "/ask": "Plain-English questions and the trusted SQL behind them, as used in the Databricks Genie space.",
  "/method": "The lakehouse: Unity Catalog tables, MLflow, Genie, AI/BI and the GitHub Actions pipeline.",
};

export default function Home() {
  const { headline: h, monthly, products, issues, growth } = overview;
  const months = [...new Set(monthly.map((m) => m.month))].sort();
  const total = months.map((m) => monthly.filter((r) => r.month === m).reduce((s, r) => s + r.complaints, 0));
  const line = (p: string) => months.map((m) => monthly.find((r) => r.month === m && r.product === p)?.complaints ?? 0);
  const biggest = products[0].product;
  const series = [{ name: "All products", values: total }, { name: biggest, values: line(biggest) }];
  const others = products.slice(1, 6).map((p) => ({ name: p.product, values: line(p.product) }));
  const first = total[0], last = total[total.length - 1];
  const change = (100 * (last - first)) / first;
  const best = model.scores[0];
  const named = topics.topics.filter((t) => t.name);
  const classes = new Set(model.confusion.map((c) => c.actual)).size;

  return (
    <>
      <section className="hero night">
        <Vanta />
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="label rise d1">A Databricks lakehouse project · CFPB complaints</div>
              <h1 className="rise">What bank customers complain about, and <em>where each complaint should go</em></h1>
              <p className="lead rise d2">
                {compact(h.complaints)} complaints sent to the US Consumer Financial Protection Bureau between {monthName(h.first_month)} and
                mid-August 2026, turned into trends, themes nobody had a label for, and a model that reads a complaint and routes it to the right team.
              </p>
              <div className="row rise d3">
                <Link className="btn" href="/routing">See the routing model <span className="arr">→</span></Link>
                <Link className="btn ghost" href="/method">How it&apos;s built</Link>
              </div>
            </div>
            <Radar products={products} />
          </div>
          <div className="readout rise d3">
            <div><b className="hl">{compact(h.complaints)}</b><span>complaints, {monthName(h.first_month)} to {monthName(h.last_month)}</span></div>
            <div><b>{pct(100 * best.macro_f1, 1)}</b><span>macro F1 routing each complaint to 1 of {classes} products ({modelLabel[best.model] ?? best.model})</span></div>
            <div><b>{named.length || topics.topics.length}</b><span>themes found by topic modeling in {n(h.sample)} complaint letters</span></div>
            <div><b>{h.companies_scored}</b><span>companies with 500+ complaints compared on how they respond</span></div>
          </div>
        </div>
      </section>

      <section className="room paper">
        <div className="wrap" data-reveal>
          <div className="room-head">
            <div>
              <div className="label">01 · The trend</div>
              <h2>Monthly complaints are {change >= 0 ? "up" : "down"} <em>{pct(Math.abs(change), 0)}</em> in {months.length - 1} months</h2>
            </div>
            <p>From <b>{n(first)}</b> in {monthName(months[0])} to <b>{n(last)}</b> in {monthName(months[months.length - 1])}. {biggest} is {pct(products[0].share_pct)} of everything, so the second chart shows the rest on their own scale.</p>
          </div>
          <div className="card">
            <LineChart months={months} series={series} kind="compact" yLabel="Complaints" />
            <p className="source">All complaints in the archive, with or without a written narrative. August 2026 is left out because the archive stops on 14 August. Source: CFPB.</p>
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <h3>The next five products</h3>
            <LineChart months={months} series={others} kind="compact" yLabel="Complaints" height={260} />
            <p className="source">
              The January 2025 spike is in the CFPB data: 42,521 money-transfer complaints were filed under &ldquo;Other transaction problem&rdquo; that
              month, against 3,720 in February. Source: CFPB.
            </p>
          </div>
        </div>
      </section>

      <section className="room paper">
        <div className="wrap" data-reveal>
          <div className="room-head">
            <div>
              <div className="label">02 · Where they land</div>
              <h2>One product takes <em>{pct(products[0].share_pct, 0)}</em> of all complaints</h2>
            </div>
            <p>The share of complaints by product, and the issues customers picked on the CFPB form inside each one.</p>
          </div>
          <div className="grid g2">
            <div className="card">
              <h3>Share of complaints by product</h3>
              <Bars rows={products.map((p) => ({ label: p.product, value: p.share_pct }))} format={(v) => pct(v)} highlight={[products[0].product]} />
              <p className="source">{monthName(h.first_month)} to July 2026, all complaints. Source: CFPB.</p>
            </div>
            <div className="card">
              <h3>Top issues inside a product</h3>
              <IssueExplorer issues={issues} products={products.map((p) => p.product)} />
              <p className="source">Share of that product&apos;s complaints, {monthName(h.first_month)} to July 2026. Source: CFPB.</p>
            </div>
          </div>
        </div>
      </section>

      {growth.length > 0 && (
        <section className="room night">
          <div className="wrap" data-reveal>
            <div className="room-head">
              <div>
                <div className="label">03 · What&apos;s rising</div>
                <h2>The issues growing <em>fastest</em></h2>
              </div>
              <p>May to July 2026 against the same months of 2025. Only issues with at least 300 complaints in both periods.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Issue</th><th className="num">May–Jul 2025</th><th className="num">May–Jul 2026</th><th className="num">Change</th></tr></thead>
                <tbody>
                  {growth.slice(0, 10).map((g) => (
                    <tr key={g.product + g.issue}>
                      <td>{g.product}</td><td>{g.issue}</td>
                      <td className="num">{n(g.year_ago)}</td><td className="num">{n(g.recent)}</td>
                      <td className={`num ${g.change_pct >= 0 ? "up" : "down"}`}>{g.change_pct >= 0 ? "▲ +" : "▼ "}{pct(g.change_pct, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="source">Source: CFPB, all complaints. Computed in notebook 03 (gold_issue_growth).</p>
          </div>
        </section>
      )}

      <section className="room paper">
        <div className="wrap" data-reveal>
          <div className="label">04 · Go deeper</div>
          <h2 style={{ marginBottom: 32 }}>Six more rooms</h2>
          <div className="index">
            {LINKS.slice(1).map(([href, title], i) => (
              <Link key={href} href={href}>
                <span className="n">{String(i + 2).padStart(2, "0")}</span>
                <span className="t">{title}</span>
                <span className="d">{ABOUT[href]}</span>
                <span className="go" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
