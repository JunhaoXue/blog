import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { getPost, getComments } from "@/lib/content";
import { formatDate, site } from "@/lib/site";
import { ArticleReader } from "@/components/article-reader";
import { articleText } from "@/lib/annotations";
import { GitHubRecords } from "@/components/github-records";
import { PostActions } from "@/components/post-actions";
import { getPostReactions } from "@/lib/post-reactions";
import { getSession } from "@/lib/authorization";
import { ArticleCover } from "@/components/article-cover";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "文章不存在" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${site.url}/posts/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      url: `${site.url}/posts/${post.slug}`,
      images: post.coverId
        ? [
            {
              url: `/api/media/${post.coverId}`,
              alt: post.coverAlt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: post.coverId ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      images: post.coverId ? [`/api/media/${post.coverId}`] : undefined,
    },
    robots: post.demo ? { index: false, follow: true } : undefined,
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const session = await getSession();
  const reactions = getPostReactions("article", post.id, session?.user.id);
  return (
    <div className="reading-shell">
      <Link className="back-link" href="/">
        ← 返回文章
      </Link>
      <header className="article-header">
        <div className="post-meta">
          <Link href={`/?category=${encodeURIComponent(post.category)}`}>
            {post.category}
          </Link>
          <span>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>·</span>
          <span>{post.readingMinutes} 分钟阅读</span>
        </div>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
        {post.demo && (
          <div className="notice">
            示例文章 · 用于预览新版博客，可在后台替换或删除。
          </div>
        )}
      </header>
      {post.coverId && (
        <ArticleCover
          id={post.coverId}
          alt={post.coverAlt || post.title}
          priority
        />
      )}
      <ArticleReader
        articleId={post.id}
        content={post.content}
        text={articleText(post.content)}
        revision={createHash("sha256").update(post.content).digest("hex")}
        comments={getComments(post.id)}
      >
        <div className="article-end">
          <div className="tags">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                # {tag}
              </Link>
            ))}
          </div>
        </div>
        <PostActions
          key={session?.user.id || "guest"}
          target="article"
          id={post.id}
          path={`/posts/${post.slug}`}
          title={post.title}
          signedIn={Boolean(session)}
          initialCount={reactions.count}
          initialLiked={reactions.liked}
        />
        <GitHubRecords records={post.githubRecords} />
      </ArticleReader>
    </div>
  );
}
