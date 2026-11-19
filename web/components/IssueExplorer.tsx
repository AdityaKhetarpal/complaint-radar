"use client";
import { useState } from "react";
import type { Issue } from "@/lib/data";
import Bars from "./Bars";

// Pick a product to see the issues customers chose most often on the CFPB form.
export default function IssueExplorer({ issues, products }: { issues: Issue[]; products: string[] }) {
  const [product, setProduct] = useState(products[0]);
  const rows = issues.filter((i) => i.product === product).sort((a, b) => a.rank_in_product - b.rank_in_product);
  return (
    <div>
      <label className="field">
        <span>Product</span>
        <select value={product} onChange={(e) => setProduct(e.target.value)}>
          {products.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <Bars rows={rows.map((r) => ({ label: r.issue, value: r.share_of_product_pct }))} format={(v) => `${v.toFixed(1)}%`} highlight={rows.slice(0, 1).map((r) => r.issue)} />
    </div>
  );
}
