"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquarePlus, X, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authClient } from "@/lib/auth-client";
import {
  annotationPlugin,
  makeAnchor,
  resolveAnchor,
  type PublicComment,
  type TextAnchor,
} from "@/lib/annotations";
import { formatDate } from "@/lib/site";
import { Comments } from "./comments";

type SelectionDraft = { anchor: TextAnchor; x: number; y: number };

export function ArticleReader({
  articleId,
  content,
  text,
  revision,
  comments,
  children,
}: {
  articleId: string;
  content: string;
  text: string;
  revision: string;
  comments: PublicComment[];
  children: React.ReactNode;
}) {
  const reader = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [selection, setSelection] = useState<SelectionDraft | null>(null);
  const [draft, setDraft] = useState<TextAnchor | null>(null);
  const [threadIds, setThreadIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [viewport, setViewport] = useState({ height: 0, bottom: 0 });

  const ranges = useMemo(
    () =>
      comments.flatMap((comment) => {
        if (!comment.anchor || comment.parentId) return [];
        const range = resolveAnchor(text, comment.anchor, revision);
        return range ? [{ id: comment.id, ...range }] : [];
      }),
    [comments, text, revision],
  );
  const plugin = useMemo(() => annotationPlugin(ranges), [ranges]);
  const threads = comments.filter(
    (comment) => threadIds.includes(comment.id) && !comment.parentId,
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function readSelection() {
      if (dialog.current?.open) return;
      const selected = window.getSelection();
      const article = reader.current;
      if (!article || !selected?.rangeCount || selected.isCollapsed) {
        setSelection(null);
        setSelectionError("");
        return;
      }
      const range = selected.getRangeAt(0);
      if (
        !article.contains(range.startContainer) ||
        !article.contains(range.endContainer)
      ) {
        setSelection(null);
        return;
      }
      const exact = range.toString();
      if (!exact.trim()) return;
      const before = range.cloneRange();
      before.selectNodeContents(article);
      before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      const rect = range.getBoundingClientRect();
      setSelection({
        anchor: makeAnchor(text, start, start + exact.length, revision),
        x: Math.max(
          16,
          Math.min(window.innerWidth - 160, rect.left + rect.width / 2 - 68),
        ),
        y: Math.max(16, Math.min(window.innerHeight - 64, rect.top - 52)),
      });
      setSelectionError(
        exact.length > 2000
          ? "一次最多选择 2000 字，请缩短选区。"
          : text.slice(start, start + exact.length) !== exact ||
              article.textContent !== text
            ? "正文已变化，请刷新页面后重试。"
            : "",
      );
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(readSelection, 100);
    }
    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerup", schedule);
    document.addEventListener("keyup", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerup", schedule);
      document.removeEventListener("keyup", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [text, revision]);

  // The native modal keeps focus inside the discussion and restores normal
  // document scrolling on close; dvh accommodates the mobile software keyboard.
  const open = useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setMessage("");
    setBody("");
    setSelection(null);
    setIsOpen(true);
    dialog.current?.showModal();
    if (session) requestAnimationFrame(() => textarea.current?.focus());
  }, [session]);
  function close() {
    if (busy) return;
    dialog.current?.close();
  }
  function onClosed() {
    setIsOpen(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    if (returnFocus.current?.isConnected)
      returnFocus.current.focus({ preventScroll: true });
  }
  const openThread = useCallback(
    (id: string) => {
      const comment = comments.find((c) => c.id === id && !c.parentId);
      if (!comment?.anchor) return;
      setThreadIds([id]);
      setDraft(null);
      setReplyTo(id);
      open();
    },
    [comments, open],
  );
  useEffect(() => {
    const hash = window.location.hash.replace(/^#comment-/, "");
    if (hash && comments.some((c) => c.id === hash && c.anchor))
      openThread(hash);
    // Only open deep-linked threads on navigation; refreshing after a reply
    // must keep the user's current discussion and submission feedback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const visual = window.visualViewport;
    function updateViewport() {
      setViewport({
        height: visual?.height || window.innerHeight,
        bottom: visual
          ? Math.max(0, window.innerHeight - visual.height - visual.offsetTop)
          : 0,
      });
    }
    updateViewport();
    visual?.addEventListener("resize", updateViewport);
    visual?.addEventListener("scroll", updateViewport);
    return () => {
      document.body.style.overflow = previous;
      visual?.removeEventListener("resize", updateViewport);
      visual?.removeEventListener("scroll", updateViewport);
    };
  }, [isOpen]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          content: body,
          ...(draft ? { anchor: draft } : { parentId: replyTo }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "提交失败，请重试。");
      setMessage(
        result.approved
          ? "评论已发布。"
          : "评论已提交，审核通过后显示划线和讨论。",
      );
      setBody("");
      if (result.approved && draft) {
        setDraft(null);
        setThreadIds([result.id]);
        setReplyTo(result.id);
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  function locate(id: string) {
    dialog.current?.close();
    requestAnimationFrame(() => {
      const mark =
        reader.current?.querySelector<HTMLElement>(
          `[data-comment-ids~="${id}"]`,
        ) ||
        Array.from(
          reader.current?.querySelectorAll<HTMLElement>("[data-comment-ids]") ||
            [],
        ).find((m) => m.dataset.commentIds?.split(",").includes(id));
      mark?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
        inline: "center",
      });
      mark?.focus({ preventScroll: true });
    });
  }

  return (
    <>
      <p className="annotation-help muted">
        选中文字可评论，点按划线查看讨论。
      </p>
      <article
        className="prose annotated-prose"
        ref={reader}
        aria-label="文章正文"
        tabIndex={0}
        onClickCapture={(event) => {
          const mark = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-comment-ids]",
          );
          if (!mark || !window.getSelection()?.isCollapsed) return;
          event.preventDefault();
          setThreadIds(mark.dataset.commentIds!.split(","));
          setDraft(null);
          setReplyTo(mark.dataset.commentIds!.split(",")[0]);
          open();
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[plugin]}
          components={{
            mark: ({ children, node, ...props }) => {
              const ids = String(node?.properties.dataCommentIds || "");
              return (
                <mark
                  {...props}
                  className="annotation-mark"
                  data-comment-ids={ids}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看划线评论：${comments.find((c) => ids.split(",").includes(c.id))?.anchor?.exact.slice(0, 60) || ""}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setThreadIds(ids.split(","));
                      setDraft(null);
                      setReplyTo(ids.split(",")[0]);
                      open();
                    }
                  }}
                >
                  {children}
                </mark>
              );
            },
            table: ({ children, node: _node, ...props }) => (
              <table {...props} tabIndex={0} aria-label="文章表格，可左右滚动">
                {children}
              </table>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
      {selection && (
        <div
          className="annotation-toolbar"
          style={{ left: selection.x, top: selection.y }}
          aria-label="选中文字操作"
        >
          {selectionError ? (
            <span role="status">{selectionError}</span>
          ) : (
            <button
              type="button"
              className="post-action-button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                setDraft(selection.anchor);
                setThreadIds([]);
                setReplyTo(null);
                open();
              }}
            >
              <MessageSquarePlus size={16} /> 划线评论
            </button>
          )}
        </div>
      )}
      {children}
      <Comments
        articleId={articleId}
        comments={comments}
        onOpenThread={openThread}
      />
      <dialog
        ref={dialog}
        className="annotation-dialog"
        style={
          viewport.height
            ? ({
                "--annotation-viewport-height": `${viewport.height}px`,
                "--annotation-keyboard-inset": `${viewport.bottom}px`,
              } as CSSProperties)
            : undefined
        }
        aria-labelledby="annotation-title"
        onClose={onClosed}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              close();
          }
        }}
      >
        <header className="annotation-dialog-header">
          <strong id="annotation-title">
            {draft ? "划线评论" : "原文讨论"}
          </strong>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭划线评论"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="annotation-dialog-body">
          {draft && (
            <blockquote className="comment-quote">{draft.exact}</blockquote>
          )}
          {threads.map((thread) => (
            <section
              className="annotation-thread"
              key={thread.id}
              aria-label={`${thread.author} 的划线评论`}
            >
              <blockquote className="comment-quote">
                {thread.anchor?.exact}
              </blockquote>
              {ranges.some((r) => r.id === thread.id) ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => locate(thread.id)}
                >
                  <ArrowUpRight size={14} />
                  定位原文
                </button>
              ) : (
                <p className="muted annotation-stale">
                  原文已变更，暂时无法定位这段文字。
                </p>
              )}
              {[
                thread,
                ...comments.filter((c) => c.parentId === thread.id),
              ].map((item) => (
                <article className="comment-row" key={item.id}>
                  <header>
                    <strong>{item.author}</strong>
                    <time dateTime={item.date}>{formatDate(item.date)}</time>
                  </header>
                  <p>{item.content}</p>
                </article>
              ))}
              {threads.length > 1 && (
                <button
                  type="button"
                  className="text-button"
                  aria-pressed={replyTo === thread.id}
                  onClick={() => {
                    setReplyTo(thread.id);
                    textarea.current?.focus();
                  }}
                >
                  回复这条讨论{replyTo === thread.id && " · 已选择"}
                </button>
              )}
            </section>
          ))}
          {!draft && !threads.length && (
            <p className="muted">评论已隐藏或删除，请刷新页面。</p>
          )}
          {session && (draft || threads.some((t) => t.id === replyTo)) ? (
            <form className="comment-form annotation-compose" onSubmit={send}>
              <label htmlFor="annotation-comment">
                {draft ? "写下你的想法" : "回复这段原文的讨论"}
              </label>
              <textarea
                ref={textarea}
                id="annotation-comment"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                maxLength={3000}
                placeholder="写下你的想法…"
                disabled={busy}
              />
              <div>
                <small>评论审核后公开。</small>
                <button className="button" disabled={busy || !body.trim()}>
                  {busy ? "正在提交…" : draft ? "提交评论" : "提交回复"}
                </button>
              </div>
            </form>
          ) : (
            !session && (
              <div className="notice">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
                  登录后{draft ? "添加划线评论" : "参与讨论"} →
                </Link>
              </div>
            )
          )}
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
