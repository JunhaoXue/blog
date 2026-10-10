"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/site";
export function Comments({
  articleId,
  comments,
  target = "article",
}: {
  articleId: string;
  target?: "article" | "discussion";
  comments: {
    id: string;
    author: string;
    content: string;
    date: string;
    votes: number;
  }[];
}) {
  const { data: session } = authClient.useSession();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          target,
          content: new FormData(form).get("content"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        result.approved ? "评论已发布。" : "评论已提交，审核通过后显示。",
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  async function vote(id: string) {
    setMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    }
  }
  return (
    <section className="comments">
      <h2>
        聊聊想法 <span className="muted">{comments.length}</span>
      </h2>
      {comments.map((comment) => (
        <article className="comment-row" key={comment.id}>
          <header>
            <strong>{comment.author}</strong>
            <time>{formatDate(comment.date)}</time>
          </header>
          <p>{comment.content}</p>
          {target === "article" && (
            <button
              className="text-button"
              onClick={() => vote(comment.id)}
              aria-label={`赞同 ${comment.author} 的评论`}
            >
              <ThumbsUp size={12} /> {comment.votes}
            </button>
          )}
        </article>
      ))}
      {!comments.length && (
        <p className="muted">还没有评论，欢迎留下第一个想法。</p>
      )}
      {session ? (
        <form className="comment-form" onSubmit={send}>
          <label htmlFor="comment">以 {session.user.name} 的身份发表评论</label>
          <textarea
            id="comment"
            name="content"
            placeholder="写下你的想法…"
            required
            maxLength={3000}
          />
          <div>
            <small>评论审核后公开，请保持友善。</small>
            <button className="button" disabled={busy}>
              {busy ? "正在提交…" : "发表评论 →"}
            </button>
          </div>
        </form>
      ) : (
        <div className="notice">
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
            登录后发表评论 →
          </Link>
        </div>
      )}
      {message && (
        <div role="status" className="form-message">
          {message}
        </div>
      )}
    </section>
  );
}
