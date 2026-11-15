// Every number on the site comes from these files, written by notebook 07 (notebooks/07_export.ipynb).
import overviewJson from "@/public/data/overview.json";
import companiesJson from "@/public/data/companies.json";
import modelJson from "@/public/data/model.json";
import topicsJson from "@/public/data/topics.json";
import assistantJson from "@/public/data/assistant.json";
import askJson from "@/public/data/ask.json";

export type Headline = {
  complaints: number; first_month: string; last_month: string; with_narrative: number;
  sample: number; companies_scored: number; llm: string; archive_cutoff: string;
};
export type Monthly = { month: string; product: string; complaints: number };
export type Product = { product: string; complaints: number; share_pct: number };
export type Issue = { product: string; issue: string; complaints: number; rank_in_product: number; share_of_product_pct: number };
export type Growth = { product: string; issue: string; recent: number; year_ago: number; change_pct: number };
export type Company = { company: string; complaints: number; timely_pct: number; relief_pct: number; explanation_pct: number; in_progress_pct: number };
export type CompanyProduct = { company: string; product: string; complaints: number };
export type Response = { product: string; company_response: string; complaints: number; share_of_product_pct: number };
export type Score = { model: string; accuracy: number; macro_f1: number; train_seconds: number; baseline_macro_f1: number; train_rows: number; test_rows: number };
export type ClassRow = { label: string; precision: number; recall: number; "f1-score": number; support: number };
export type Cell = { actual: string; predicted: string; complaints: number };
export type Routing = { confidence_at_least: number; auto_routed_pct: number; accuracy_of_auto_routed_pct: number };
export type Phrase = { product: string; top_phrases: string };
export type Mistake = { complaint_id: string; product: string; predicted: string; excerpt: string };
export type LlmRow = { model: string; accuracy: number; macro_f1: number; seconds_per_complaint: number | null };
export type Topic = { topic: number; top_words: string; complaints: number; share_pct: number; main_products: string; copy_pct: number; top_issue: string | null; name: string | null; summary: string | null };
export type Example = { topic: number; rank: number; complaint_id: string; product: string; narrative: string };
export type TopicTrend = { month: string; topic: number; complaints: number; share_pct: number };
export type Answer = { question: string; answer: string; sources: string; cited: string; made_up_citations: string };
export type Source = { complaint_id: string; product: string; date_received: string; narrative: string };
export type AskExample = { question: string; sql: string; result: Record<string, string | number | null>[] };

export const overview = overviewJson as unknown as { headline: Headline; monthly: Monthly[]; products: Product[]; issues: Issue[]; growth: Growth[] };
export const companies = companiesJson as unknown as { companies: Company[]; products: CompanyProduct[]; responses: Response[] };
export const model = modelJson as unknown as { scores: Score[]; classes: ClassRow[]; confusion: Cell[]; routing: Routing[]; phrases: Phrase[]; mistakes: Mistake[]; llm: LlmRow[]; llm_rows: number };
export const topics = topicsJson as unknown as { topics: Topic[]; examples: Example[]; trend: TopicTrend[] };
export const assistant = assistantJson as unknown as { answers: Answer[]; sources: Source[] };
export const ask = askJson as unknown as { examples: AskExample[] };

// formatting helpers
export const n = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
export const compact = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K` : `${Math.round(v)}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const shortMonth = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(2, 4)}`;
export const dateName = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

// tidy model names for display
export const modelLabel: Record<string, string> = {
  logistic_regression: "Logistic regression",
  linear_svm: "Linear SVM",
  complement_nb: "Complement naive Bayes",
};

// CFPB narratives mask personal details as XXXX; show them as a neutral redaction mark
export const redact = (t: string) => t.replace(/X{2,}(\/X{2,})*(\/\d{2,4})?/g, "▇▇").replace(/\{\$([\d,.]+)\}/g, "$$$1");
