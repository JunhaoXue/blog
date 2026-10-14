import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/site";
export const metadata = { title: "归档" };
export default function Archive() {
  const posts = getPosts();
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>归档</h1>
      </div>
      <div className="archive-list">
        {posts.map((post) => (
          <Link
            className="archive-row"
            href={`/posts/${post.slug}`}
            key={post.id}
          >
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>
              {post.title}
              {post.demo && <small>示例</small>}
            </span>
            <ArrowUpRight size={16} aria-hidden="true" focusable="false" />
          </Link>
        ))}
      </div>
      {!posts.length && <div className="empty-state">还没有公开文章。</div>}
    </div>
  );
}
