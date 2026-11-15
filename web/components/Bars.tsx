// Horizontal bars: label, bar, value. The highlighted rows use the accent colour.
export default function Bars({ rows, format, highlight = [] }: {
  rows: { label: string; value: number }[]; format: (v: number) => string; highlight?: string[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className={`bar${highlight.includes(r.label) ? " hi" : ""}`}>
          <span className="label" title={r.label}>{r.label}</span>
          <span className="track"><span className="fill" style={{ width: `${(100 * r.value) / max}%`, display: "block" }} /></span>
          <span className="val">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
