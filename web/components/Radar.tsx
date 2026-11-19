"use client";
import { useEffect, useRef, useState } from "react";

// The hero radar is also a chart: each blip is one product, its size is that product's share of all complaints,
// and the biggest products sit nearest the centre. The beam turns at a constant speed and each blip pings as it
// passes. The sweep pauses while the radar is off screen, and stays still for people who ask for less motion.
const C = 200, R = 180, SWEEP = 6;
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};

export default function Radar({ products }: { products: { product: string; share_pct: number }[] }) {
  const box = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const max = Math.max(...products.map((p) => p.share_pct));
  const last = Math.max(products.length - 1, 1);
  const blips = products.map((p, i) => {
    const deg = (i * 137.5 + 58) % 360;                 // golden-angle spread, so no two blips line up
    const dist = 34 + 128 * Math.sqrt(i / last);        // biggest products nearest the centre
    const size = 3 + 15 * Math.sqrt(p.share_pct / max);
    const [x, y] = at(deg, dist);
    return { ...p, deg, x, y, size, delay: (deg / 360) * SWEEP - SWEEP };
  });
  // the beam: a bright leading edge and a fading trail, drawn as thin slices
  const slices = Array.from({ length: 10 }, (_, k) => {
    const a0 = -k * 4.5, a1 = -(k + 1) * 4.5;
    const [x0, y0] = at(a0, R), [x1, y1] = at(a1, R);
    return { d: `M${C},${C} L${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 0 ${x1.toFixed(1)},${y1.toFixed(1)} Z`, o: 0.3 * (1 - k / 10) ** 1.6 };
  });
  const [lx, ly] = at(0, R);
  const top = blips.slice(0, 3);

  return (
    <figure ref={box} className={`radar fade-in${paused ? " paused" : ""}`}>
      <svg viewBox="-40 -10 480 420" role="img"
        aria-label={`Radar of complaints by product: ${products.slice(0, 3).map((p) => `${p.product} ${p.share_pct.toFixed(1)}%`).join(", ")}, and ${products.length - 3} smaller products.`}>
        {[45, 90, 135].map((r) => <circle key={r} className="ring" cx={C} cy={C} r={r} />)}
        <circle className="ring outer" cx={C} cy={C} r={R} />
        <line className="axis" x1={C - R} x2={C + R} y1={C} y2={C} />
        <line className="axis" x1={C} x2={C} y1={C - R} y2={C + R} />
        <g className="sweep" aria-hidden="true">
          {slices.map((s, k) => <path key={k} d={s.d} fill="var(--signal)" opacity={s.o} />)}
          <line x1={C} y1={C} x2={lx} y2={ly} stroke="var(--signal)" strokeWidth={1.4} />
        </g>
        {blips.map((b) => (
          <g key={b.product}>
            <title>{`${b.product}: ${b.share_pct.toFixed(2)}% of complaints`}</title>
            <circle className="ping" cx={b.x} cy={b.y} r={b.size} style={{ animationDelay: `${b.delay.toFixed(2)}s` }} />
            <circle className="blip" cx={b.x} cy={b.y} r={b.size} style={{ animationDelay: `${b.delay.toFixed(2)}s` }} />
          </g>
        ))}
        {top.map((b) => {
          // put the label on whichever side of the blip has no other blip under it
          const w = Math.max(b.product.length, 6) * 8.2, gap = b.size + 8;
          const clear = (right: boolean) => blips.every((o) => {
            if (o === b) return true;
            const x0 = right ? b.x + gap : b.x - gap - w, x1 = x0 + w, y0 = b.y - 16, y1 = b.y + 16;
            const nx = Math.max(x0, Math.min(o.x, x1)), ny = Math.max(y0, Math.min(o.y, y1));
            return (o.x - nx) ** 2 + (o.y - ny) ** 2 > (o.size + 3) ** 2;
          });
          const prefer = b.x >= C;
          const right = clear(prefer) ? prefer : clear(!prefer) ? !prefer : prefer;
          const x = right ? b.x + gap : b.x - gap;
          return (
            <g key={b.product} aria-hidden="true">
              <text x={x} y={b.y - 4} textAnchor={right ? "start" : "end"}>{b.product.toUpperCase()}</text>
              <text className="v" x={x} y={b.y + 13} textAnchor={right ? "start" : "end"}>{b.share_pct.toFixed(1)}%</text>
            </g>
          );
        })}
      </svg>
      <figcaption>Each blip is a product, sized by its share of complaints</figcaption>
    </figure>
  );
}
