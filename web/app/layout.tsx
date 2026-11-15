import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/source-serif-4";
import "./globals.css";
import Nav from "@/components/Nav";
import Motion from "@/components/Motion";
import { overview, dateName } from "@/lib/data";

const SITE = "https://complaintradar.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Complaint Radar: what US bank customers complain about", template: "%s · Complaint Radar" },
  description:
    "A Databricks lakehouse project on US consumer finance complaints: routing complaints with text classification, finding themes with topic modeling, LLM summaries and a complaints assistant.",
  openGraph: { title: "Complaint Radar", description: "What US bank customers complain about, and a model that routes each complaint to the right team.", url: SITE, siteName: "Complaint Radar", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const h = overview.headline;
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <footer>
          <div className="wrap">
            <span>
              Data: <a href="https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/">CFPB Consumer Complaint Database narratives archive</a>,
              complaints received 1 Jan 2025 to {dateName(h.archive_cutoff)}. US government data, public domain.
            </span>
            <span>Complaint counts are patterns, not findings that any company broke a rule. Analysis for education, not legal or financial advice. Not affiliated with the CFPB.</span>
            <span><a href="https://github.com/AdityaKhetarpal/complaint-radar">Source code and notebooks on GitHub</a> · built by <a href="https://www.linkedin.com/in/adityakhetarpal">Aditya Khetarpal</a></span>
          </div>
        </footer>
        <Motion />
      </body>
    </html>
  );
}
