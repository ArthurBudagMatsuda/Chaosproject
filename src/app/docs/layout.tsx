import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { ChaosMark } from "@/components/ui";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { docsNavigation } from "@/lib/docs-content";
import "./docs.css";

export const metadata: Metadata = { title: { default: "CHAOS — Protocol Documentation", template: "%s — CHAOS Docs" }, description: "Protocol documentation for CHAOS market observations, treasury monitoring and verified financial records." };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="docs-shell"><a className="skip-link" href="#docs-main">Skip to documentation</a><header className="docs-header"><Link href="/docs" className="brand" aria-label="CHAOS documentation home"><ChaosMark small /><span>CHAOS<span className="brand-dot">DOCS</span></span></Link><span className="mono docs-header-label">PROTOCOL DOCUMENTATION / CURRENT ARCHITECTURE</span><Link className="docs-back mono" href="/"><ArrowUpLeft size={15} />BACK TO CHAOS</Link></header><div className="docs-workspace"><DocsSidebar items={docsNavigation} />{children}</div></div>;
}
