"use client";

import { useEffect, useState } from "react";
import { loreChapters } from "@/lib/chaos-lore";

export function LoreNavigation() {
  const [active, setActive] = useState<string>(loreChapters[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const current = entries.find(entry => entry.isIntersecting);
      if (current) setActive(current.target.id);
    }, { rootMargin: "-15% 0px -55% 0px", threshold: 0 });
    for (const chapter of loreChapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return <nav className="lore-nav" aria-label="Lore chapters"><span className="mono lore-nav-label">FIELD NOTES / 001</span>{loreChapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? "location" : undefined}><span>{chapter.number}</span><span>{chapter.label}</span></a>)}<span className="mono lore-nav-foot">READ. OBSERVE. REPEAT.</span></nav>;
}
