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
import { ArticleToc } from "@/components/article-toc";
import { articleHeadings } from "@/lib/article-headings";
import { ArticleByline } from "@/components/article-byline";
import { articleAuthor } from "@/lib/article-author";
import { getResume } from "@/lib/resume";
import { ArticleCopy } from "@/components/article-copy";
import { BackLink } from "@/components/back-link";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "文章不存在" };
  const author = articleAuthor(getResume());
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: author.name, url: `${site.url}${author.url}` }],
    alternates: { canonical: `${site.url}/posts/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: site.title,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [`${site.url}${author.url}`],
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
  const author = articleAuthor(getResume());
  const headings = articleHeadings(post.content, {
    numbered: post.headingNumbering,
  });
  return (
    <div
      className={`article-layout${headings.length ? " article-with-toc" : ""}`}
    >
      <div className="reading-shell">
        <div className="article-utility-bar">
          <BackLink href="/" label="返回文章" />
        </div>
        <header className="article-header">
          <div className="post-meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <Link href={`/?category=${encodeURIComponent(post.category)}`}>
              {post.category}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} 分钟阅读</span>
          </div>
          <h1>{post.title}</h1>
          <ArticleByline author={author} />
          <p>{post.description}</p>
          {post.demo && (
            <div className="notice">
              示例文章 · 用于预览新版博客，可在后台替换或删除。
            </div>
          )}
        </header>
        <ArticleToc headings={headings} compact />
        <ArticleReader
          articleId={post.id}
          content={post.content}
          text={articleText(post.content)}
          revision={createHash("sha256").update(post.content).digest("hex")}
          comments={getComments(post.id)}
          headingNumbering={post.headingNumbering}
        >
          <p className="article-copyright">
            © {author.name} · 未经作者允许，不得转载。
          </p>
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
      <aside className="article-rail" aria-label="文章目录与操作">
        <ArticleToc headings={headings} />
        <ArticleCopy
          markdown={`# ${post.title}\n\n${post.description}\n\n作者：${author.name}\n\n${post.content}`}
        />
      </aside>
    </div>
  );
}
