"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Mark from "./Mark";
import { LINKS } from "@/lib/links";


// Desktop: every page in one row. Phones: a Menu button opens a numbered list of all seven pages,
// so none of them hides off the edge of the screen.
export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/"><Mark />Complaint Radar</Link>
        <nav className="nav" aria-label="Pages">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <button type="button" className="menu-btn" aria-expanded={open} aria-controls="sheet" onClick={() => setOpen((o) => !o)}>
          <i aria-hidden="true" />{open ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="sheet" className="sheet" data-open={open} aria-label="Pages" inert={!open}>
        {LINKS.map(([href, label], i) => (
          <Link key={href} href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>
            <span>{String(i + 1).padStart(2, "0")}</span>{label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
