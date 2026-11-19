"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Lenis for smooth scrolling, and GSAP to bring sections in as they scroll into view.
// Only sections that start below the fold animate: anything on screen when the page loads is shown at once,
// and nothing is hidden before this script has run, so a slow connection never shows a blank page.
// Each section is one entrance: its parts arrive as a single wave. The first part travels furthest and the gaps shrink.
const DELAYS = [0, 0.04, 0.07, 0.095, 0.115];

export default function Motion() {
  const path = usePathname();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: { destroy: () => void } | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => { if (!cancelled) lenis = new Lenis({ autoRaf: true }); });
    return () => { cancelled = true; lenis?.destroy(); };
  }, []);

  useEffect(() => {
    // less motion: a short fade only, no movement and no stagger
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))
      .filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92);
    if (!sections.length) return;
    const parts = (el: Element) => Array.from(el.children) as HTMLElement[];
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      sections.forEach((el) => gsap.set(parts(el), { opacity: 0, y: calm ? 0 : (i: number) => (i === 0 ? 12 : 8) }));
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          observer?.unobserve(e.target);
          gsap.to(parts(e.target), {
            opacity: 1, y: 0, overwrite: true, clearProps: "transform",
            duration: calm ? 0.15 : 0.28,
            ease: calm ? "power1.out" : "power4.out",   // power4.out is the strong ease-out curve, cubic-bezier(0.23, 1, 0.32, 1) family
            delay: (i: number) => (calm ? 0 : DELAYS[Math.min(i, DELAYS.length - 1)]),
          });
        });
      }, { rootMargin: "0px 0px -6% 0px" });
      sections.forEach((el) => observer!.observe(el));
    }).catch(() => {});

    return () => { cancelled = true; observer?.disconnect(); };
  }, [path]);

  return null;
}
