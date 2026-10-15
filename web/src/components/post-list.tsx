import Link from "next/link";
import type { Post } from "@/lib/content";
import { formatDate } from "@/lib/site";
import { ArticleCover } from "./article-cover";
import { ArrowRight } from "lucide-react";
import { IconLabel } from "./icon-label";
export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length)
    return (
      <div className="empty-state">
        <p>这里还没有文章</p>
        <p>换个关键词，或过段时间再来看看。</p>
        <Link href="/">
          <IconLabel icon={ArrowRight}>查看全部文章</IconLabel>
        </Link>
      </div>
    );
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article
          className={`post-row${post.coverId ? " post-with-cover" : ""}`}
          key={post.id}
        >
          {post.coverId && (
            <div className="post-cover">
              <ArticleCover
                id={post.coverId}
                alt={post.coverAlt || post.title}
                variant="card"
              />
            </div>
          )}
          <div className="post-content">
            <div className="post-copy">
              <h2>
                <Link href={`/posts/${post.slug}`} className="post-title-link">
                  <span className="post-title-text">{post.title}</span>
                </Link>
              </h2>
              <p>{post.description}</p>
            </div>
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <Link href={`/?category=${encodeURIComponent(post.category)}`}>
                {post.category}
              </Link>
              {post.tags.map((tag) => (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                  # {tag}
                </Link>
              ))}
              {post.demo && <span className="demo-badge">示例文章</span>}
              <span className="post-reading-time">
                {post.readingMinutes} 分钟阅读
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
