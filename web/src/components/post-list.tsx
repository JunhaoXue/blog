import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/content";
import { formatDate } from "@/lib/site";
export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length)
    return (
      <div className="empty-state">
        <h2>这里还没有文章</h2>
        <p>换个关键词，或过段时间再来看看。</p>
        <Link href="/">查看全部文章 →</Link>
      </div>
    );
  return (
    <div className="post-list">
      {posts.map((post, index) => (
        <article className="post-row" key={post.id}>
          <span className="post-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="post-content">
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <Link href={`/?category=${encodeURIComponent(post.category)}`}>
                {post.category}
              </Link>
              {post.demo && <span className="demo-badge">示例文章</span>}
            </div>
            <h2>
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            </h2>
            <p>{post.description}</p>
            <div className="post-bottom">
              <div className="tags">
                {post.tags.map((tag) => (
                  <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                    # {tag}
                  </Link>
                ))}
              </div>
              <span>{post.readingMinutes} 分钟阅读</span>
            </div>
          </div>
          <Link
            href={`/posts/${post.slug}`}
            className="post-arrow"
            aria-label={`阅读 ${post.title}`}
          >
            <ArrowUpRight size={22} />
          </Link>
        </article>
      ))}
    </div>
  );
}
