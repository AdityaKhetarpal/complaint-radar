// The site's pages, in nav order (shared by the header menu, the index on the home page,
// the "next page" link at the end of each page and the 404 page)
export const LINKS: [string, string][] = [
  ["/", "Overview"],
  ["/themes", "Themes"],
  ["/routing", "Routing model"],
  ["/companies", "Companies"],
  ["/assistant", "Assistant"],
  ["/ask", "Ask the data"],
  ["/method", "How it's built"],
];

// the question each page answers
export const QUESTION: Record<string, string> = {
  "/": "What do bank customers complain about, and how fast is it growing?",
  "/themes": "What are the letters really about, beyond the form's fixed list of issues?",
  "/routing": "Can a model read a complaint and send it to the right team?",
  "/companies": "How do the biggest companies close their complaints?",
  "/assistant": "Can an LLM answer questions about complaints and cite real ones?",
  "/ask": "Can a manager ask the data a question in plain English?",
  "/method": "How is it built on Databricks, and how can you run it yourself?",
};
