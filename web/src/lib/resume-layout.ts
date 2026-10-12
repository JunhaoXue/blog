import type { Element, ElementContent, Root, RootContent } from "hast";

function text(node: RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(text).join("") : "";
}

function compact(nodes: RootContent[]): RootContent[] {
  return nodes.filter((node) => node.type !== "text" || node.value.trim());
}

function element(
  tagName: string,
  className: string,
  children: RootContent[],
): Element {
  return {
    type: "element",
    tagName,
    properties: { className: className.split(" ") },
    children: children.filter(
      (node): node is ElementContent => node.type !== "doctype",
    ),
  };
}

function entryHeader(node: RootContent) {
  if (node.type !== "element" || node.tagName !== "p") return null;
  const [title, ...rest] = compact(node.children);
  if (
    title?.type !== "element" ||
    title.tagName !== "strong" ||
    !text(title).trim()
  )
    return null;
  if (!rest.length) return { title: title.children, date: "" };
  if (rest[0]?.type !== "element" || rest[0].tagName !== "br") return null;
  if (rest.slice(1).some((child) => child.type !== "text")) return null;
  const date = rest.slice(1).map(text).join("").trim();
  if (!/^\d{4}(?:[./-]\d{1,2})?(?:\s|$)/u.test(date)) return null;
  return { title: title.children, date };
}

function layout(nodes: RootContent[], projects: boolean): Element | null {
  const blocks = compact(nodes);
  const entries: Element[] = [];
  for (let i = 0; i < blocks.length;) {
    const header = entryHeader(blocks[i]);
    if (!header) return null;
    let end = i + 1;
    while (end < blocks.length && !entryHeader(blocks[end])) end++;
    const body = blocks.slice(i + 1, end);
    // Incomplete editor input retains its ordinary Markdown rendering.
    if (!body.length) return null;
    const title = element("h3", "resume-entry-title", header.title);
    const date = header.date
      ? [
          element("p", "resume-entry-date", [
            { type: "text", value: header.date },
          ]),
        ]
      : [];
    entries.push(
      projects
        ? element("article", "resume-project-card surface-card", [
            title,
            ...date,
            ...body,
          ])
        : element("div", "resume-work-row", [
            element("div", "resume-work-period", date),
            element("div", "resume-work-detail", [title, ...body]),
          ]),
    );
    i = end;
  }
  return entries.length
    ? element(
        "div",
        projects ? "resume-project-grid" : "resume-work-list",
        entries,
      )
    : null;
}

/** Apply resume layouts only to recognized sections; retain all other Markdown. */
export function resumeLayoutPlugin() {
  return (tree: Root) => {
    const output: RootContent[] = [];
    for (let i = 0; i < tree.children.length;) {
      const node = tree.children[i];
      const label = text(node).trim();
      if (
        node.type !== "element" ||
        node.tagName !== "h2" ||
        !["工作经历", "作品"].includes(label)
      ) {
        output.push(node);
        i++;
        continue;
      }
      let end = i + 1;
      while (end < tree.children.length) {
        const next = tree.children[end];
        if (next.type === "element" && ["h1", "h2"].includes(next.tagName))
          break;
        end++;
      }
      const body = tree.children.slice(i + 1, end);
      const formatted = layout(body, label === "作品");
      output.push(node, ...(formatted ? [formatted] : body));
      i = end;
    }
    tree.children = output;
  };
}
