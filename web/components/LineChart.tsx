"use client";
import { useMemo, useState } from "react";

export type Series = { name: string; values: (number | null)[] };

const COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(2, 4)}`;

// A multi-line chart over months. Click a legend item to hide or show a line; hover to read the values.
// how to show numbers (a name, because functions can't be passed from server pages to client components)
const FORMATS = {
  compact: (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K` : `${Math.round(v)}`),
  percent: (v: number) => `${v.toFixed(v < 10 ? 1 : 0)}%`,
};

export default function LineChart({ months, series, kind, yLabel, height = 300 }: {
  months: string[]; series: Series[]; kind: keyof typeof FORMATS; yLabel: string; height?: number;
}) {
  const format = FORMATS[kind];
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = height, L = 56, R = 12, T = 12, B = 30;
  const shown = series.filter((s) => !hidden.includes(s.name));
  const max = useMemo(() => {
    const all = shown.flatMap((s) => s.values.filter((v): v is number => v != null));
    const m = Math.max(...all, 1);
    const step = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / step) * step;
  }, [shown]);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(months.length - 1, 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.ceil(months.length / 8);

  return (
    <div>
      <div className="legend">
        {series.map((s, i) => (
          <button key={s.name} type="button" aria-pressed={!hidden.includes(s.name)}
            onClick={() => setHidden((h) => (h.includes(s.name) ? h.filter((x) => x !== s.name) : [...h, s.name]))}>
            <i style={{ background: COLORS[i % COLORS.length] }} />{s.name}
          </button>
        ))}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} by month`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          const i = Math.round(((px - L) / (W - L - R)) * (months.length - 1));
          setHover(Math.max(0, Math.min(months.length - 1, i)));
        }}>
        <g className="grid">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
              <text x={L - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
            </g>
          ))}
        </g>
        {months.map((m, i) => (i % every === 0 || i === months.length - 1) && (
          <text key={m} x={x(i)} y={H - 8} textAnchor="middle">{label(m)}</text>
        ))}
        {series.map((s, si) => hidden.includes(s.name) ? null : (
          <path key={s.name} fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth={si === 0 ? 2.6 : 1.8} strokeLinejoin="round"
            d={s.values.map((v, i) => (v == null ? "" : `${i === 0 || s.values[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("")} />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />}
        {hover != null && shown.map((s) => {
          const v = s.values[hover];
          const si = series.indexOf(s);
          return v == null ? null : <circle key={s.name} cx={x(hover)} cy={y(v)} r={3.5} fill={COLORS[si % COLORS.length]} />;
        })}
      </svg>
      <div className="tip" aria-live="polite">
        {hover != null ? (
          <><b>{label(months[hover])}</b>{shown.map((s) => s.values[hover] == null ? null : <span key={s.name}> · {s.name} {format(s.values[hover] as number)}</span>)}</>
        ) : "Hover the chart to read the values. Click a name above to hide or show its line."}
      </div>
    </div>
  );
}
