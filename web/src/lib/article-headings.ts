import type { Root, RootContent, Element } from "hast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

export type ArticleHeading = { id: string; title: string; depth: number };

function headingText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.tagName === "img")
    return String(node.properties.alt || "");
  if ("children" in node) return node.children.map(headingText).join("");
  return "";
}

// Both the outline and rendered anchors use the same Markdown tree. Adding
// attributes only keeps the rendered text and underline comment offsets intact.
function collectHeadings(tree: Root): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  function visit(parent: Root | Element) {
    for (const node of parent.children) {
      if (node.type !== "element") continue;
      if (/^h[1-6]$/.test(node.tagName)) {
        const title = headingText(node).replace(/\s+/g, " ").trim();
        if (title) {
          const id = `article-section-${headings.length + 1}`;
          node.properties.id = id;
          headings.push({ id, title, depth: Number(node.tagName.slice(1)) });
        }
      }
      visit(node);
    }
  }
  visit(tree);
  return headings;
}

export function articleHeadings(content: string): ArticleHeading[] {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  return collectHeadings(processor.runSync(processor.parse(content)) as Root);
}

export function articleHeadingsPlugin() {
  return (tree: Root) => {
    collectHeadings(tree);
  };
}
