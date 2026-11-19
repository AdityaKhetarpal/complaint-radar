import Redacted from "@/components/Redacted";
import type { Metadata } from "next";
import LineChart from "@/components/LineChart";
import { topics, overview, n, pct, dateName } from "@/lib/data";

export const metadata: Metadata = { title: "Themes", description: "Themes in US consumer finance complaints found by topic modeling (NMF), named and summarised by an LLM." };

export default function Themes() {
  const list = topics.topics.filter((t) => t.topic >= 0);
  const months = [...new Set(topics.trend.map((r) => r.month))].sort();
  const name = (t: (typeof list)[number]) => t.name || `Theme ${t.topic + 1}`;
  // the four biggest themes on the trend chart
  const big = list.slice(0, 4);
  const series = big.map((t) => ({ name: name(t), values: months.map((m) => topics.trend.find((r) => r.month === m && r.topic === t.topic)?.share_pct ?? null) }));
  const h = overview.headline;
  const campaigns = list.filter((t) => t.copy_pct >= 40).length;

  return (
    <div className="wrap">
      <div className="head">
        <div className="label">Topic modeling · NMF on TF-IDF · named by an LLM</div>
        <h1>The themes inside the complaint letters</h1>
        <p>
          The CFPB form makes customers pick an issue from a fixed list. Their own words say more. Topic modeling grouped {n(h.sample)} complaint
          letters into {list.length} themes without being told what to look for. A language model ({h.llm}) then read each theme&apos;s most typical
          complaints and gave it a name and a summary.
        </p>
        <div className="readout r3">
          <div><b className="hl">{list.length}</b><span>themes, found without being told what to look for</span></div>
          <div><b>{n(h.sample)}</b><span>complaint letters in the balanced sample</span></div>
          <div><b>{campaigns}</b><span>themes that are mostly copy-paste letters</span></div>
        </div>
      </div>

      <section className="section" data-reveal>
        <h2>How the biggest themes change over time</h2>
        <p className="sub">Each line is a theme&apos;s share of that month&apos;s complaints in the sample.</p>
        <div className="card">
          <LineChart months={months} series={series} kind="percent" yLabel="Share of complaints" height={260} />
          <p className="source">Balanced sample of complaints with narratives (at most 4,000 per product), Jan 2025 to Jul 2026. Source: CFPB narratives archive, cut off {dateName(h.archive_cutoff)}.</p>
        </div>
      </section>

      <section className="section" data-reveal>
        <h2>All {list.length} themes</h2>
        <p className="sub">
          Biggest first. Shares are of the balanced sample, so they show what complaint letters talk about, not how common each product is.
          {campaigns > 0 && <> {campaigns} themes are mostly <b>copy-paste letters</b>: the same text sent many times, often from credit repair templates.</>}
        </p>
        <div className="grid g2">
          {list.map((t) => (
            <article key={t.topic} className="card topic">
              <h3>{name(t)}</h3>
              {t.summary && <p>{t.summary}</p>}
              <div className="meta">
                <span><b>{n(t.complaints)}</b> complaints ({pct(t.share_pct)})</span>
                <span>Mostly: {t.main_products}</span>
                {t.copy_pct >= 40 ? <span className="hot">Copy-paste campaign: {pct(t.copy_pct, 0)} repeated letters</span> : <span>{pct(t.copy_pct, 0)} repeated letters</span>}
              </div>
              <p className="words"><b>Key words:</b> {t.top_words}</p>
              <details>
                <summary>Read typical complaints</summary>
                <div className="grid" style={{ gap: 10 }}>
                  {topics.examples.filter((e) => e.topic === t.topic).map((e) => (
                    <blockquote key={e.complaint_id}>
                      <Redacted text={e.narrative} />{e.narrative.length >= 600 ? "…" : ""}
                      <small>Complaint {e.complaint_id} · {e.product}</small>
                    </blockquote>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
        <p className="source">Complaint text as published by the CFPB, which removes names and other personal details (shown as <span className="redacted">redacted</span>).</p>
      </section>
    </div>
  );
}
