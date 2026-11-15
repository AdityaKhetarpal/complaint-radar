import type { Metadata } from "next";
import CompanyTable from "@/components/CompanyTable";
import Bars from "@/components/Bars";
import { companies, overview, pct, n, monthName } from "@/lib/data";

export const metadata: Metadata = { title: "Companies", description: "How companies respond to US consumer finance complaints: answered on time, closed with relief, explanation only." };

export default function Companies() {
  const rows = companies.companies;
  const top: Record<string, string> = {};
  for (const r of companies.products) if (!top[r.company]) top[r.company] = r.product; // rows come sorted by complaints
  const h = overview.headline;
  const products = [...new Set(companies.responses.map((r) => r.product))];
  const reliefBy = products.map((p) => ({
    label: p,
    value: companies.responses.filter((r) => r.product === p && /relief/.test(r.company_response)).reduce((s, r) => s + r.share_of_product_pct, 0),
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="wrap">
      <div className="head">
        <div className="kicker">SQL gold tables · gold_companies, gold_responses</div>
        <h1>How companies respond to complaints</h1>
        <p>
          When the CFPB forwards a complaint, the company must reply. This page compares how the {rows.length} companies with the most complaints closed
          them. A company with more customers gets more complaints, so the counts are not a ranking of who is worst, and nothing here says any company
          broke a rule.
        </p>
      </div>

      <section className="section" data-reveal>
        <div className="callout" style={{ marginBottom: 20 }}>
          <b>How to read it.</b> &ldquo;Closed with relief&rdquo; means the customer got money back or another fix. &ldquo;Explanation only&rdquo; means the company replied
          without changing anything. &ldquo;Answered on time&rdquo; is the share answered within the CFPB&apos;s 15-day window.
        </div>
        <CompanyTable rows={rows} top={top} />
        <p className="source">All complaints received {monthName(h.first_month)} to {monthName(h.last_month)} (archive cut-off 14 Aug 2026). Companies with at least 500 complaints; the {rows.length} largest of {n(h.companies_scored)} shown. Source: CFPB.</p>
      </section>

      <section className="section" data-reveal>
        <div className="card">
          <h3>Share of complaints closed with relief, by product</h3>
          <p className="sub">{reliefBy[0]?.label} complaints end with relief most often ({pct(reliefBy[0]?.value ?? 0)}); {reliefBy[reliefBy.length - 1]?.label} least often ({pct(reliefBy[reliefBy.length - 1]?.value ?? 0)}).</p>
          <Bars rows={reliefBy} format={(v) => pct(v)} highlight={[reliefBy[0]?.label]} />
          <p className="source">Monetary plus non-monetary relief, all companies. Source: CFPB.</p>
        </div>
      </section>
    </div>
  );
}
