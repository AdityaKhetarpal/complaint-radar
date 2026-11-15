"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/"><Mark />Complaint Radar</Link>
        <nav className="nav" aria-label="Pages">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
