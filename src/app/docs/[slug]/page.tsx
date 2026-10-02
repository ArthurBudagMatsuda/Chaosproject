import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-article";
import { docsPages, getDocPage } from "@/lib/docs-content";

export const dynamicParams = false;
export function generateStaticParams() { return docsPages.filter(page => page.slug).map(page => ({ slug: page.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getDocPage((await params).slug);
  return { title: page?.label ?? "Page not found", description: page?.description };
}
export default async function DocumentationPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getDocPage((await params).slug);
  if (!page) notFound();
  return <DocsArticle page={page} />;
}
