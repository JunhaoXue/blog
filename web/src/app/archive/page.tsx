import Link from "next/link";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/site";
export const metadata = { title: "归档" };
export default function Archive() {
  const posts = getPosts();
  const groups = Map.groupBy(posts, (p) => new Date(p.date).getFullYear());
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">A TRAIL OF THOUGHTS</span>
        <h1>
          文章归档<span className="accent">.</span>
        </h1>
        <p>把时间串起来，看看想法如何生长。共 {posts.length} 篇记录。</p>
      </div>
      {[...groups].map(([year, items]) => (
        <section className="archive-year" key={year}>
          <h2>
            {year}
            <span>{items.length} 篇</span>
          </h2>
          {items.map((post) => (
            <Link
              className="archive-row"
              href={`/posts/${post.slug}`}
              key={post.id}
            >
              <time>{formatDate(post.date).slice(5)}</time>
              <span>
                {post.title}
                {post.demo && <small>示例</small>}
              </span>
              <span>↗</span>
            </Link>
          ))}
        </section>
      ))}
      {!posts.length && <div className="empty-state">还没有公开文章。</div>}
    </div>
  );
}
