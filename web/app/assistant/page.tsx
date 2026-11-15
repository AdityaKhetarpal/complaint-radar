import type { Metadata } from "next";
import { assistant, overview, redact, dateName } from "@/lib/data";

export const metadata: Metadata = { title: "Complaints assistant", description: "Retrieval-augmented answers about US consumer finance complaints, with every citation checked." };

// turn "[1234567]" citations into links to the quoted complaint below the answer
function withLinks(text: string, qi: number) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    return m ? <a key={i} className="cite" href={`#q${qi}-${m[1]}`}>[{m[1]}]</a> : <span key={i}>{part}</span>;
  });
}

export default function Assistant() {
  const byId = Object.fromEntries(assistant.sources.map((s) => [s.complaint_id, s]));
  const answers = assistant.answers;
  const clean = answers.filter((a) => !a.made_up_citations).length;
  const citing = answers.filter((a) => a.cited).length;

  return (
    <div className="wrap">
      <div className="head">
        <div className="kicker">Retrieval-augmented generation · {overview.headline.llm}</div>
        <h1>Ask the complaints, get answers you can check</h1>
        <p>
          For each question, the assistant first finds the 8 complaints most similar to it (TF-IDF retrieval), then a language model answers using only
          those complaints and cites them by ID. Every citation is then checked against the 8 it was given.
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
              <div className="a">{withLinks(a.answer, qi)}</div>
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
