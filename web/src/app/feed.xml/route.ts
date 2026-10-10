import { getPosts } from "@/lib/content";
import { site } from "@/lib/site";
const escape = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
export function GET() {
  const items = getPosts()
    .filter((p) => !p.demo)
    .slice(0, 30)
    .map(
      (p) =>
        `<item><title>${escape(p.title)}</title><link>${site.url}/posts/${p.slug}</link><guid>${site.url}/posts/${p.slug}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${escape(p.description)}</description></item>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(site.title)}</title><link>${site.url}</link><description>${escape(site.description)}</description><language>zh-CN</language>${items}</channel></rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
