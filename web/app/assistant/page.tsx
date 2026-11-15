import type { Metadata } from "next";
import { assistant, overview, redact, dateName } from "@/lib/data";

export const metadata: Metadata = { title: "Complaints assistant", description: "Retrieval-augmented answers about US consumer finance complaints, with every citation checked." };

// turn "[1234567]" citations into links to the quoted complaint below the answer
function withLinks(text: string, qi: number) {
  // citations look like [123] or, grouped, [123, 456]: link every ID inside the brackets
  return text.split(/(\[\d{6,}(?:\s*,\s*\d{6,})*\])/g).map((part, i) => {
    const ids = /^\[[\d,\s]+\]$/.test(part) ? part.match(/\d{6,}/g) ?? [] : [];
    if (!ids.length) return <span key={i}>{part}</span>;
    return <span key={i}>[{ids.map((id, j) => <span key={id}>{j > 0 && ", "}<a className="cite" href={`#q${qi}-${id}`}>{id}</a></span>)}]</span>;
  });
}

// the model writes plain text: paragraphs, and lists as lines that start with "-", "*" or "•"
function Answer({ text, qi }: { text: string; qi: number }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { blocks.push({ list: false, lines: [] }); continue; }
    const item = /^[-*•]\s*/.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.list === item && last.lines.length && item) last.lines.push(line.replace(/^[-*•]\s*/, ""));
    else if (last && !item && !last.list && last.lines.length) last.lines.push(line);
    else blocks.push({ list: item, lines: [item ? line.replace(/^[-*•]\s*/, "") : line] });
  }
  return (
    <div className="a">
      {blocks.filter((b) => b.lines.length).map((b, i) => b.list
        ? <ul key={i}>{b.lines.map((l, j) => <li key={j}>{withLinks(l, qi)}</li>)}</ul>
        : <p key={i}>{withLinks(b.lines.join(" "), qi)}</p>)}
    </div>
  );
}

export default function Assistant() {
  const byId = Object.fromEntries(assistant.sources.map((s) => [s.complaint_id, s]));
  const answers = assistant.answers;
  const clean = answers.filter((a) => !a.made_up_citations).length;
  const citing = answers.filter((a) => a.cited).length;
  const k = answers[0]?.sources.split(",").length ?? 0;   // how many complaints each question searched

  return (
    <div className="wrap">
      <div className="head">
        <div className="kicker">Retrieval-augmented generation · {overview.headline.llm}</div>
        <h1>Ask the complaints, get answers you can check</h1>
        <p>
          For each question, the assistant first finds the {k} complaints most similar to it (TF-IDF retrieval), then a language model answers using only
          those complaints and cites them by ID. Every citation is then checked against the {k} it was given.
        </p>
      </div>

      <section className="section" data-reveal>
        <p className="answer-line">
          <b>{clean} of {answers.length}</b> answers used only real citations, and <b>{citing} of {answers.length}</b> cited at least one complaint.
        </p>
        <div className="callout">
          These answers were generated once by the pipeline and saved, so this page needs no API key and costs nothing to host. To ask your own
          questions, run notebook 06 in Databricks, where it uses a Foundation Model endpoint.
        </div>
      </section>

      {answers.map((a, qi) => {
        const cited = a.cited ? a.cited.split(",") : [];
        const madeUp = a.made_up_citations ? a.made_up_citations.split(",") : [];
        const shown = (cited.length ? cited.filter((c) => byId[c]) : a.sources.split(",").slice(0, 2));
        return (
          <section key={a.question} className="section" data-reveal>
            <div className="card qa">
              <div className="q">{a.question}</div>
              <Answer text={a.answer} qi={qi} />
              <div className="row">
                {madeUp.length === 0
                  ? <span className="check ok">✓ {cited.length ? `all ${cited.length} citations are real complaints` : "no citations made up"}</span>
                  : <span className="check no">✗ cited {madeUp.length} complaint ID{madeUp.length > 1 ? "s" : ""} it was not given: {madeUp.join(", ")}</span>}
                <span className="check">searched {a.sources.split(",").length} complaints</span>
              </div>
              <details>
                <summary>{cited.length ? "Read the cited complaints" : "Read the top complaints it was given"}</summary>
                <div className="grid" style={{ gap: 10 }}>
                  {shown.map((id) => byId[id] && (
                    <blockquote key={id} id={`q${qi}-${id}`}>
                      {redact(byId[id].narrative)}{byId[id].narrative.length >= 700 ? "…" : ""}
                      <small>Complaint {id} · {byId[id].product} · received {dateName(byId[id].date_received)}</small>
                    </blockquote>
                  ))}
                </div>
              </details>
            </div>
          </section>
        );
      })}
      <p className="source">Complaints received 1 Jan 2025 to {dateName(overview.headline.archive_cutoff)}. Text as published by the CFPB, with personal details removed (▇▇).</p>
    </div>
  );
}
