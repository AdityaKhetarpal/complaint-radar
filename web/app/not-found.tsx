import Link from "next/link";
import type { Metadata } from "next";
import { LINKS, QUESTION } from "@/lib/links";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="head">
        <div className="label">404 · No signal</div>
        <h1>Nothing on the radar at <em>this address</em></h1>
        <p>The page may have moved, or the link has a typo. Every page on the site is listed below.</p>
      </div>
      <section className="section">
        <div className="index">
          {LINKS.map(([href, title], i) => (
            <Link key={href} href={href}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="t">{title}</span>
              <span className="d">{QUESTION[href]}</span>
              <span className="go" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
