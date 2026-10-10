import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { database } from "@/lib/database";
import { formatDate } from "@/lib/site";
import { Comments } from "@/components/comments";
import { PostActions } from "@/components/post-actions";
import { getPostReactions } from "@/lib/post-reactions";
import { getSession } from "@/lib/authorization";
export const metadata = { title: "讨论详情" };
export default async function Discussion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = database
    .prepare("SELECT * FROM discussions WHERE id=?")
    .get(id) as
    | { title: string; content: string; author: string; created_at: string }
    | undefined;
  if (!item) notFound();
  const session = await getSession();
  const reactions = getPostReactions("discussion", id, session?.user.id);
  const replies = database
    .prepare(
      "SELECT id,author,content,created_at AS date,0 AS votes FROM replies WHERE discussion_id=? AND approved=1 ORDER BY created_at",
    )
    .all(id) as {
    id: string;
    author: string;
    content: string;
    date: string;
    votes: number;
  }[];
  return (
    <div className="reading-shell">
      <Link className="back-link" href="/discussions">
        ← 返回讨论
      </Link>
      <div className="article-header">
        <span className="post-meta">
          {item.author} · {formatDate(item.created_at)}
        </span>
        <h1>{item.title}</h1>
      </div>
      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {item.content}
        </ReactMarkdown>
      </div>
      <PostActions
        key={session?.user.id || "guest"}
        target="discussion"
        id={id}
        path={`/discussions/${id}`}
        title={item.title}
        signedIn={Boolean(session)}
        initialCount={reactions.count}
        initialLiked={reactions.liked}
      />
      <Comments target="discussion" articleId={id} comments={replies} />
    </div>
  );
}
