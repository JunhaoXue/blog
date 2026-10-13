import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/content";
import { formatDate } from "@/lib/site";
import { ArticleCover } from "./article-cover";
export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length)
    return (
      <div className="empty-state">
        <p>这里还没有文章</p>
        <p>换个关键词，或过段时间再来看看。</p>
        <Link href="/">查看全部文章 →</Link>
      </div>
    );
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article
          className={`post-row surface-card${post.coverId ? " post-with-cover" : ""}`}
          key={post.id}
        >
          {post.coverId && (
            <Link
              href={`/posts/${post.slug}`}
              className="post-cover-link"
              aria-label={`阅读 ${post.title}`}
            >
              <ArticleCover
                id={post.coverId}
                alt={post.coverAlt || post.title}
                variant="card"
              />
            </Link>
          )}
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
