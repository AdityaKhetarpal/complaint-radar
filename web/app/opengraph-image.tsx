import { ImageResponse } from "next/og";
import { overview, model, topics, compact } from "@/lib/data";

// The picture shown when a link to the site is shared (1200x630). Numbers come from the same data files as the site.
export const alt = "Complaint Radar: what US bank customers complain about, and a model that routes each complaint";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const h = overview.headline;
  const best = model.scores[0];
  const stats = [
    [compact(h.complaints), "complaints"],
    [`${(100 * best.macro_f1).toFixed(1)}%`, "macro F1 routing"],
    [String(topics.topics.length), "themes found"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0d1210", color: "#ffffff", padding: "72px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <path d="M16 16 L16 3.2 A12.8 12.8 0 0 1 27.1 9.6 Z" fill="#c6f16b" />
            <circle cx="16" cy="16" r="12.8" fill="none" stroke="#ffffff" strokeWidth="2.2" />
            <circle cx="16" cy="16" r="7" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.45" />
            <circle cx="21.6" cy="9.4" r="2.2" fill="#ffffff" />
            <circle cx="9.6" cy="20.2" r="1.8" fill="#ffffff" fillOpacity="0.7" />
            <circle cx="19.2" cy="23" r="1.5" fill="#ffffff" fillOpacity="0.7" />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Complaint Radar</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 960 }}>
            What bank customers complain about, and where each complaint should go
          </div>
          <div style={{ fontSize: 26, color: "#95a097" }}>A Databricks lakehouse project on US consumer finance complaints (CFPB)</div>
        </div>
        <div style={{ display: "flex", gap: 56 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#c6f16b" }}>{v}</div>
              <div style={{ fontSize: 22, color: "#95a097" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
