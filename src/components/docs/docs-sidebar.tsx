"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

export function DocsSidebar({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const open = expandedPath === pathname;
  const selected = items.find(item => item.href === pathname)?.label ?? "Documentation";
  return <aside className="docs-sidebar">
    <button className="docs-mobile-toggle" aria-expanded={open} aria-controls="docs-navigation" onClick={() => setExpandedPath(open ? null : pathname)}><span><span className="mono">DOCUMENTATION</span>{selected}</span>{open ? <X size={18} /> : <ChevronDown size={18} />}</button>
    <nav id="docs-navigation" className={`docs-navigation ${open ? "is-open" : ""}`} aria-label="Documentation sections">
      <p className="mono docs-nav-label">FIELD MANUAL / 001</p>
      {items.map((item, index) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setExpandedPath(null)}><span className="mono">{String(index + 1).padStart(2, "0")}</span>{item.label}</Link>)}
      <div className="docs-sidebar-note mono"><span className="status-dot" />EVOLVING SPECIFICATION<br />FINANCIAL PROTOCOL NOT LIVE</div>
    </nav>
  </aside>;
}
