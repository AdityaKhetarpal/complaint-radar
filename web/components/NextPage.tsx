"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS, QUESTION } from "@/lib/links";

// At the end of every inner page: the next page in order, so no page is a dead end.
// The home page ends with its own index, so it shows nothing here.
export default function NextPage() {
  const path = usePathname();
  const i = LINKS.findIndex(([href]) => href === path);
  if (i <= 0) return null;
  const n = (i + 1) % LINKS.length;
  const [href, title] = LINKS[n];
  return (
    <section className="next">
      <div className="wrap">
        <Link href={href}>
          <span className="label">{n === 0 ? "Back to the start" : `Next · ${String(n + 1).padStart(2, "0")} of ${String(LINKS.length).padStart(2, "0")}`}</span>
          <span className="t">{title} <span className="go" aria-hidden="true">→</span></span>
          <span className="d">{QUESTION[href]}</span>
        </Link>
      </div>
    </section>
  );
}
