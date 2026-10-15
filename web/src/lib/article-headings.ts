import type { Root, RootContent, Element } from "hast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

export type ArticleHeading = {
  id: string;
  title: string;
  depth: number;
  number?: string;
};
export type HeadingOptions = { numbered?: boolean };

function headingText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.tagName === "img")
    return String(node.properties.alt || "");
  if ("children" in node) return node.children.map(headingText).join("");
  return "";
}

// Both the outline and rendered anchors use the same Markdown tree. Adding
// attributes only keeps the rendered text and underline comment offsets intact.
function collectHeadings(
  tree: Root,
  { numbered = false }: HeadingOptions = {},
): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const numberedCandidates: { node: Element; heading: ArticleHeading }[] = [];
  function visit(
    parent: Root | Element,
    insideList = false,
    insideQuote = false,
  ) {
    for (const node of parent.children) {
      if (node.type !== "element") continue;
      if (/^h[1-6]$/.test(node.tagName)) {
        const title = headingText(node).replace(/\s+/g, " ").trim();
        if (title) {
          const id = `article-section-${headings.length + 1}`;
          node.properties.id = id;
          const heading = { id, title, depth: Number(node.tagName.slice(1)) };
          headings.push(heading);
          if (!insideList && !insideQuote)
            numberedCandidates.push({ node, heading });
        }
      }
      visit(
        node,
        insideList || node.tagName === "ol" || node.tagName === "ul",
        insideQuote || node.tagName === "blockquote",
      );
    }
  }
  visit(tree);
  if (numbered && numberedCandidates.length) {
    const base = Math.min(
      ...numberedCandidates.map(({ heading }) => heading.depth),
    );
    const counters = Array<number>(6).fill(0);
    for (const { node, heading } of numberedCandidates) {
      const level = heading.depth - base;
      for (let i = 0; i < level; i++) if (!counters[i]) counters[i] = 1;
      counters[level]++;
      counters.fill(0, level + 1);
      const manual = /^(\d+(?:\.\d+)*)(?:[、.)．]\s*|\s+)(?=\S)/u.exec(
        heading.title,
      );
      if (manual) {
        const values = manual[1].split(".").map(Number);
        if (
          values.every(Number.isSafeInteger) &&
          values.every((value) => value > 0)
        ) {
          if (values.length === level + 1)
            values.forEach((value, index) => {
              counters[index] = value;
            });
          else counters[level] = values[values.length - 1];
        }
        continue;
      }
      if (/^[一二三四五六七八九十百]+[、.．]\s*\S/u.test(heading.title))
        continue;
      const number = counters.slice(0, level + 1).join(".");
      heading.number = level === 0 ? `${number}.` : number;
      // 导入时标题只有层级和文字，自动编号需要独立显示设置；
      // 只添加属性，编号由CSS显示，避免改变划线评论的文本偏移。
      node.properties.dataHeadingNumber = heading.number;
    }
  }
  return headings;
}

export function articleHeadings(
  content: string,
  options: HeadingOptions = {},
): ArticleHeading[] {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  return collectHeadings(
    processor.runSync(processor.parse(content)) as Root,
    options,
  );
}

export function articleHeadingsPlugin(options: HeadingOptions = {}) {
  return (tree: Root) => {
    collectHeadings(tree, options);
  };
}
