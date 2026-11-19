import type { Metadata } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import Nav from "@/components/Nav";
import Motion from "@/components/Motion";
import { overview, dateName, compact } from "@/lib/data";

const SITE = "https://cfpb-complaint-radar.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Complaint Radar: what US bank customers complain about", template: "%s · Complaint Radar" },
  description:
    "A Databricks lakehouse project on US consumer finance complaints: routing complaints with text classification, finding themes with topic modeling, LLM summaries and a complaints assistant.",
  openGraph: { title: "Complaint Radar", description: "What US bank customers complain about, and a model that routes each complaint to the right team.", url: SITE, siteName: "Complaint Radar", type: "website" },
  twitter: { card: "summary_large_image", title: "Complaint Radar", description: "What US bank customers complain about, and a model that routes each complaint to the right team." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const h = overview.headline;
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="night">
          <div className="wrap">
            <p className="close">Every number on this site comes from <em>seven notebooks</em> run over {compact(h.complaints)} public complaints.</p>
            <div className="cols">
              <div>
                <p>
                  Data: <a href="https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/">CFPB Consumer Complaint Database narratives archive</a>,
                  complaints received 1 Jan 2025 to {dateName(h.archive_cutoff)}. US government data, public domain.
                </p>
                <p>Complaint counts are patterns, not findings that any company broke a rule. Analysis for education, not legal or financial advice. Not affiliated with the CFPB.</p>
              </div>
              <div className="links">
                <a href="https://github.com/AdityaKhetarpal/complaint-radar">Source code and notebooks ↗</a>
                <a href="https://www.linkedin.com/in/adityakhetarpal">Built by Aditya Khetarpal ↗</a>
              </div>
            </div>
          </div>
        </footer>
        <Motion />
      </body>
    </html>
  );
}
