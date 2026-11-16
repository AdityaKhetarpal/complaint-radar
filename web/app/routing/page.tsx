import Redacted from "@/components/Redacted";
import type { Metadata } from "next";
import Bars from "@/components/Bars";
import { model, overview, n, pct, modelLabel } from "@/lib/data";

export const metadata: Metadata = { title: "Routing model", description: "Text classification of US consumer finance complaints: TF-IDF models tracked in MLflow, a baseline, and an LLM zero-shot comparison." };

export default function Routing() {
  const best = model.scores[0];
  const labels = [...new Set(model.confusion.map((c) => c.actual))].sort();
  const classes = model.classes.filter((c) => labels.includes(c.label)).sort((a, b) => b["f1-score"] - a["f1-score"]);
  const cell = (a: string, p: string) => model.confusion.find((c) => c.actual === a && c.predicted === p)?.complaints ?? 0;
  const rowTotal = (a: string) => labels.reduce((s, p) => s + cell(a, p), 0);
  const at80 = model.routing.find((r) => r.confidence_at_least === 0.8);
  // the biggest mix-up between two different products
  const mixups = labels.flatMap((a) => labels.filter((p) => p !== a).map((p) => ({ a, p, share: cell(a, p) / Math.max(rowTotal(a), 1) })))
    .sort((x, y) => y.share - x.share);
  const llm = model.llm;

  return (
    <div className="wrap">
      <div className="head">
        <div className="kicker">Text classification · scikit-learn · tracked in MLflow</div>
        <h1>Reading a complaint and sending it to the right team</h1>
        <p>
          Every complaint has to reach the team that handles that product: cards, mortgages, debt collection and so on. Here a model reads only the
          customer&apos;s words and predicts the product. The customer also picked a product on the form, so every prediction can be checked.
        </p>
      </div>

      <section className="section" data-reveal>
        <p className="answer-line">
          The best model, <b>{modelLabel[best.model] ?? best.model}</b>, scores a macro F1 of <b>{pct(100 * best.macro_f1)}</b> on {n(best.test_rows)} complaints it never saw,
          against {pct(100 * best.baseline_macro_f1)} for always guessing the most common product.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Model</th><th className="num">Macro F1</th><th className="num">Accuracy</th><th className="num">Training time</th></tr></thead>
            <tbody>
              {model.scores.map((s) => (
                <tr key={s.model}>
                  <td>{modelLabel[s.model] ?? s.model}{s.model === best.model ? " (best)" : ""}</td>
                  <td className="num">{pct(100 * s.macro_f1)}</td><td className="num">{pct(100 * s.accuracy)}</td>
                  <td className="num">{s.train_seconds.toFixed(1)} s</td>
                </tr>
              ))}
              <tr><td>Baseline: always guess the most common product</td><td className="num">{pct(100 * best.baseline_macro_f1)}</td><td className="num">–</td><td className="num">–</td></tr>
            </tbody>
          </table>
        </div>
        <p className="source">Trained on {n(best.train_rows)} complaints, tested on {n(best.test_rows)}, split 80/20 keeping the same product mix. Every run is logged in MLflow (notebook 04). Macro F1 averages every product equally, so small products count as much as big ones.</p>
      </section>

      <section className="section grid g2" data-reveal>
        <div className="card">
          <h3>When can it route on its own?</h3>
          <p className="sub">
            Send a complaint automatically only when the model is confident, and to a person otherwise.
            {at80 && <> At 80% confidence, <b>{pct(at80.auto_routed_pct)}</b> of complaints route automatically, and <b>{pct(at80.accuracy_of_auto_routed_pct)}</b> of those are right.</>}
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Confidence at least</th><th className="num">Routed automatically</th><th className="num">Right when routed</th></tr></thead>
              <tbody>
                {model.routing.map((r) => (
                  <tr key={r.confidence_at_least}>
                    <td>{r.confidence_at_least === 0 ? "Any (route everything)" : pct(100 * r.confidence_at_least, 0)}</td>
                    <td className="num">{pct(r.auto_routed_pct)}</td><td className="num">{pct(r.accuracy_of_auto_routed_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source">Logistic regression probabilities on the test set.</p>
        </div>
        <div className="card">
          <h3>Score per product (F1)</h3>
          <p className="sub">Weakest: {classes[classes.length - 1]?.label}, which overlaps with other products.</p>
          <Bars rows={classes.map((c) => ({ label: c.label, value: 100 * c["f1-score"] }))} format={(v) => pct(v)} highlight={[classes[classes.length - 1]?.label]} />
          <p className="source">Best model, test set.</p>
        </div>
      </section>

      <section className="section" data-reveal>
        <h2>Which products get mixed up</h2>
        {mixups[0] && mixups[0].share > 0 && (
          <p className="sub">The biggest mix-up: {pct(100 * mixups[0].share)} of {mixups[0].a} complaints were routed to {mixups[0].p}. Often both are true, for example a debt collector reporting a debt to the credit bureaus.</p>
        )}
        <div className="card scroll-x">
          <p className="swipe">Swipe sideways to see every product →</p>
          <div className="heat" style={{ gridTemplateColumns: `minmax(110px, 150px) repeat(${labels.length}, minmax(34px, 1fr))`, minWidth: 560 }}>
            <span />
            {labels.map((p) => <span key={p} className="cl" title={p}>{p}</span>)}
            {labels.map((a) => (
              <div key={a} style={{ display: "contents" }}>
                <span className="rl" title={a}>{a}</span>
                {labels.map((p) => {
                  const share = cell(a, p) / Math.max(rowTotal(a), 1);
                  const diag = a === p;
                  return (
                    <span key={p} className="c" title={`${a} → ${p}: ${cell(a, p)} complaints (${(100 * share).toFixed(1)}%)`}
                      style={{ background: `color-mix(in srgb, ${diag ? "var(--ink)" : "var(--accent)"} ${Math.round(Math.min(1, share * (diag ? 1 : 4)) * 85)}%, var(--surface))`, color: share > (diag ? 0.5 : 0.12) ? "var(--bg)" : "var(--muted)" }}>
                      {share >= 0.005 ? Math.round(100 * share) : ""}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="source">Rows: the product the customer picked. Columns: what the model said. Numbers are % of each row. Diagonal = right.</p>
        </div>
      </section>

      <section className="section" data-reveal>
        <h2>The words behind each prediction</h2>
        <p className="sub">The phrases with the biggest weight for each product in the logistic regression. This is why the model is easy to explain.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Phrases that point to it most</th></tr></thead>
            <tbody>{model.phrases.map((p) => <tr key={p.product}><td style={{ whiteSpace: "nowrap" }}>{p.product}</td><td>{p.top_phrases}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {llm.length === 2 && (
        <section className="section" data-reveal>
          <h2>Could an LLM do this without training?</h2>
          <p className="answer-line">
            On the same {n(model.llm_rows)} test complaints, the trained model scored <b>{pct(100 * llm[0].macro_f1)}</b> macro F1 and the LLM, given only the list of products,
            scored <b>{pct(100 * llm[1].macro_f1)}</b>{llm[1].seconds_per_complaint ? <>, taking {llm[1].seconds_per_complaint.toFixed(1)} s per complaint on a CPU</> : null}.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Model</th><th className="num">Macro F1</th><th className="num">Accuracy</th><th className="num">Time per complaint</th></tr></thead>
              <tbody>
                {llm.map((r) => (
                  <tr key={r.model}><td>{r.model}</td><td className="num">{pct(100 * r.macro_f1)}</td><td className="num">{pct(100 * r.accuracy)}</td>
                    <td className="num">{r.seconds_per_complaint ? `${r.seconds_per_complaint.toFixed(1)} s` : "under 1 ms"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source">Notebook 06. LLM: {overview.headline.llm}, run on a GitHub Actions CPU. On Databricks the same notebook calls a Foundation Model endpoint instead.</p>
        </section>
      )}

      {model.mistakes.length > 0 && (
        <section className="section" data-reveal>
          <h2>Where it goes wrong</h2>
          <p className="sub">{model.mistakes.length} random wrong predictions. Many are complaints that really are about two products.</p>
          <div className="grid g2">
            {model.mistakes.map((m) => (
              <blockquote key={m.complaint_id}>
                <Redacted text={m.excerpt} />
                <small>Customer picked <b>{m.product}</b> · model said <b>{m.predicted}</b> · complaint {m.complaint_id}</small>
              </blockquote>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
