import { Fragment } from "react";

// CFPB narratives hide personal details as XXXX (names, dates, account numbers).
// We show each run of them, like "XXXX XXXX" or "XX/XX/XXXX", as one small muted label.
const MASK = /X{2,}(?:[ \t/,.-]*X{2,})*(?:\/\d{2,4})?/g;

export default function Redacted({ text }: { text: string }) {
  const clean = text.replace(/\{\$([\d,.]+)\}/g, "$$$1");   // {$750.00} -> $750.00
  const parts = clean.split(MASK);
  const masks = clean.match(MASK) ?? [];
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < masks.length && <span className="redacted" title="Removed by the CFPB to protect privacy">redacted</span>}
        </Fragment>
      ))}
    </>
  );
}
