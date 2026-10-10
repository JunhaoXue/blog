import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost, getComments } from "@/lib/content";
import { formatDate, site } from "@/lib/site";
import { Comments } from "@/components/comments";
import { GitHubRecords } from "@/components/github-records";
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
      <article className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>
      <div className="article-end">
        <span>— 感谢阅读 —</span>
        <div className="tags">
          {post.tags.map((tag) => (
            <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
              # {tag}
            </Link>
          ))}
        </div>
      </div>
      <GitHubRecords records={post.githubRecords} />
      <Comments articleId={post.id} comments={getComments(post.id)} />
    </div>
  );
}
