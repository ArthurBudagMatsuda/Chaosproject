import { DocsArticle } from "@/components/docs/docs-article";
import { docsPages } from "@/lib/docs-content";

export default function DocsOverview() { return <DocsArticle page={docsPages[0]} />; }
