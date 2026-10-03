import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { docsPages, type DocPage } from "@/lib/docs-content";

export function DocsArticle({ page }: { page: DocPage }) {
  const index = docsPages.findIndex(item => item.slug === page.slug);
  const previous = docsPages[index - 1], next = docsPages[index + 1];
  const href = (doc: DocPage) => doc.slug ? `/docs/${doc.slug}` : "/docs";
  return <div className="docs-reading-layout">
    <main id="docs-main" className="docs-main">
      <article aria-labelledby="docs-title">
        <header className="docs-article-header"><div className="docs-eyebrow mono"><span>DOCUMENTATION / {String(index + 1).padStart(2, "0")}</span><Badge>PROTOCOL</Badge></div><h1 id="docs-title">{page.title}{page.slug === "" && <span className="accent">.</span>}</h1><h2 className="docs-subtitle">{page.subtitle}</h2><p className="docs-description">{page.description}</p></header>
        {page.sections.map(section => <section className="docs-section" key={section.id} aria-labelledby={section.id}><h2 id={section.id}><a href={`#${section.id}`}>{section.title}<span aria-hidden="true">#</span></a></h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
          {section.flow && <div className="docs-flow" aria-label="Protocol lifecycle">{section.flow.map((step, i) => <div key={step}><span className="mono">{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong>{i < section.flow!.length - 1 && <ArrowRight size={15} aria-hidden="true" />}</div>)}</div>}
          {section.statuses && <div className="docs-statuses">{section.statuses.map(status => <div className="docs-status" key={status.label}><span className={`docs-status-label mono status-${status.label.toLowerCase().replaceAll(" ", "-")}`}>{status.label}</span><h3>{status.title}</h3><p>{status.detail}</p></div>)}</div>}
        </section>)}
      </article>
      <footer className="docs-page-footer"><p className="mono">REFERENCE DOCUMENTATION / CURRENT ARCHITECTURE</p><nav className="docs-pagination" aria-label="Adjacent documentation pages">{previous ? <Link href={href(previous)}><ArrowLeft size={16} /><span><small>PREVIOUS</small>{previous.label}</span></Link> : <div />}{next && <Link href={href(next)}><span><small>NEXT</small>{next.label}</span><ArrowRight size={16} /></Link>}</nav></footer>
    </main>
    <aside className="docs-toc"><nav aria-label="On this page"><p className="mono">ON THIS PAGE</p>{page.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav><p className="mono">OBSERVE.<br />QUESTION.<br />ITERATE.</p></aside>
  </div>;
}
