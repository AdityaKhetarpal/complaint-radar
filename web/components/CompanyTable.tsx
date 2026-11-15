"use client";
import { useState } from "react";
import type { Company } from "@/lib/data";

type Key = keyof Company;
const COLS: { key: Key; label: string; num?: boolean; fmt?: (v: number) => string }[] = [
  { key: "company", label: "Company" },
  { key: "complaints", label: "Complaints", num: true, fmt: (v) => Math.round(v).toLocaleString("en-US") },
  { key: "timely_pct", label: "Answered on time", num: true, fmt: (v) => `${v.toFixed(1)}%` },
  { key: "relief_pct", label: "Closed with relief", num: true, fmt: (v) => `${v.toFixed(1)}%` },
  { key: "explanation_pct", label: "Explanation only", num: true, fmt: (v) => `${v.toFixed(1)}%` },
  { key: "in_progress_pct", label: "Still in progress", num: true, fmt: (v) => `${v.toFixed(1)}%` },
];

// Click a column name to sort by it.
export default function CompanyTable({ rows, top }: { rows: Company[]; top: Record<string, string> }) {
  const [sort, setSort] = useState<{ key: Key; down: boolean }>({ key: "complaints", down: true });
  const sorted = [...rows].sort((a, b) => {
    const A = a[sort.key], B = b[sort.key];
    const c = typeof A === "number" && typeof B === "number" ? A - B : String(A).localeCompare(String(B));
    return sort.down ? -c : c;
  });
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} className={c.num ? "num" : undefined}
                aria-sort={sort.key === c.key ? (sort.down ? "descending" : "ascending") : undefined}>
                <button type="button" onClick={() => setSort((s) => ({ key: c.key, down: s.key === c.key ? !s.down : c.num ?? false }))}>
                  {c.label}{sort.key === c.key ? (sort.down ? " ↓" : " ↑") : ""}
                </button>
              </th>
            ))}
            <th>Most complaints about</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.company}>
              {COLS.map((c) => (
                <td key={c.key} className={c.num ? "num" : undefined}>
                  {c.fmt ? c.fmt(r[c.key] as number) : (r[c.key] as string)}
                </td>
              ))}
              <td>{top[r.company] ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
