import type { Root, RootContent, Element } from "hast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

export type TextAnchor = {
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  revision: string;
};
export type PublicComment = {
  id: string;
  author: string;
  content: string;
  date: string;
  votes: number;
  anchor?: TextAnchor | null;
  parentId?: string | null;
};

// Use the same Markdown pipeline as the reader. Offsets refer to rendered text,
// including structural newlines, rather than Markdown syntax or HTML strings.
export function articleText(content: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true });
  const root = processor.runSync(processor.parse(content)) as Root;
  normalizeRenderedText(root);
  function text(node: Root | RootContent): string {
    if (node.type === "text") return node.value;
    if ("children" in node) return node.children.map(text).join("");
    return "";
  }
  return text(root);
}

function normalizeRenderedText(parent: Root | Element) {
  // 浏览器选字验收发现表格后的偏移不一致：React Markdown 的 JSX 转换器
  // 会去掉 table / tr 等结构节点中的空白；服务端与划线插件必须先做同样处理。
  const structuralTable =
    parent.type === "element" &&
    ["table", "tbody", "thead", "tfoot", "tr"].includes(parent.tagName);
  parent.children = parent.children.flatMap((node): RootContent[] => {
    if (node.type === "text" && structuralTable && !node.value.trim())
      return [];
    if ((node as { type: string }).type === "raw")
      return [
        { type: "text", value: (node as unknown as { value: string }).value },
      ];
    if (node.type === "element") normalizeRenderedText(node);
    return [node];
  });
}

export function makeAnchor(
  text: string,
  start: number,
  end: number,
  revision: string,
): TextAnchor {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - 64), start),
    suffix: text.slice(end, end + 64),
    start,
    end,
    revision,
  };
}

export function resolveAnchor(
  text: string,
  anchor: TextAnchor,
  revision?: string,
) {
  if (
    revision === anchor.revision &&
    text.slice(anchor.start, anchor.end) === anchor.exact
  )
    return { start: anchor.start, end: anchor.end };
  const matches: { start: number; end: number }[] = [];
  let at = text.indexOf(anchor.exact);
  if (!anchor.exact) return null;
  while (at !== -1) {
    matches.push({ start: at, end: at + anchor.exact.length });
    at = text.indexOf(anchor.exact, at + 1);
  }
  const contextual = matches.filter(
    ({ start, end }) =>
      text.slice(0, start).endsWith(anchor.prefix) &&
      text.slice(end).startsWith(anchor.suffix),
  );
  // Repeated text with identical context is ambiguous after an edit. Never move
  // an underline onto a different occurrence just because the quote still exists.
  return contextual.length === 1 ? contextual[0] : null;
}

export function annotationPlugin(
  ranges: { id: string; start: number; end: number }[],
) {
  return function plugin() {
    return function transform(tree: Root) {
      normalizeRenderedText(tree);
      let offset = 0;
      function visit(parent: Root | Element) {
        const children: RootContent[] = [];
        for (const node of parent.children) {
          if (node.type !== "text") {
            if (node.type === "element") visit(node);
            children.push(node);
            continue;
          }
          const start = offset;
          const end = start + node.value.length;
          offset = end;
          const overlaps = ranges.filter((r) => r.start < end && r.end > start);
          const cuts = [
            ...new Set([
              start,
              end,
              ...overlaps.flatMap((r) => [
                Math.max(start, r.start),
                Math.min(end, r.end),
              ]),
            ]),
          ].sort((a, b) => a - b);
          for (let i = 0; i < cuts.length - 1; i++) {
            const a = cuts[i],
              b = cuts[i + 1];
            const value = node.value.slice(a - start, b - start);
            const ids = overlaps
              .filter((r) => r.start <= a && r.end >= b)
              .map((r) => r.id);
            children.push(
              ids.length && value.trim()
                ? {
                    type: "element",
                    tagName: "mark",
                    properties: { dataCommentIds: ids.join(",") },
                    children: [{ type: "text", value }],
                  }
                : { type: "text", value },
            );
          }
        }
        parent.children = children;
      }
      visit(tree);
    };
  };
}
