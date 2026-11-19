"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Mark from "./Mark";

const LINKS = [
  ["/", "Overview"],
  ["/themes", "Themes"],
  ["/routing", "Routing model"],
  ["/companies", "Companies"],
  ["/assistant", "Assistant"],
  ["/ask", "Ask the data"],
  ["/method", "How it's built"],
];

export default function Nav() {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  // fade an edge of the scrolling link row only when there are more links hidden past it
  const [edges, setEdges] = useState("");
  const measure = useCallback(() => {
    const el = nav.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges(`${left ? " fade-l" : ""}${right ? " fade-r" : ""}`);
  }, []);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  // on a phone the links scroll sideways: keep the current page's link in view
  useEffect(() => {
    const el = nav.current;
    const cur = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !cur) return;
    el.scrollLeft = cur.offsetLeft - (el.clientWidth - cur.offsetWidth) / 2;
    requestAnimationFrame(measure);
  }, [path, measure]);
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/"><Mark />Complaint Radar</Link>
        <nav className={`nav${edges}`} aria-label="Pages" ref={nav} onScroll={measure}>
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <a className="gh" href="https://github.com/AdityaKhetarpal/complaint-radar">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" /></svg>
          Source
        </a>
      </div>
    </header>
  );
}
