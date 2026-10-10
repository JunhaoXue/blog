"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, Share2, Copy } from "lucide-react";
import type { ReactionTarget } from "@/lib/post-reactions";

export function PostActions({
  target,
  id,
  path,
  title,
  signedIn,
  initialCount,
  initialLiked,
}: {
  target: ReactionTarget;
  id: string;
  path: string;
  title: string;
  signedIn: boolean;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [message, setMessage] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    setCount(initialCount);
    setLiked(initialLiked);
  }, [initialCount, initialLiked, signedIn]);
  async function like() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/likes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, id, liked: !liked }),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(path)}`);
        return;
      }
      if (!response.ok) throw new Error(result.error);
      setCount(result.count);
      setLiked(result.liked);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "点赞失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (sharing) return;
    const url = new URL(path, window.location.origin).href;
    setShareUrl(url);
    setMessage("");
    if (!navigator.share) return;
    setSharing(true);
    try {
      await navigator.share({ title, url });
      setShareUrl("");
      setMessage("已分享。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        setShareUrl("");
      else setMessage("可以复制下面的链接分享。");
    } finally {
      setSharing(false);
    }
  }
  async function copy() {
    setMessage("");
    const url = new URL(path, window.location.origin).href;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage("链接已复制。");
    } catch {
      setShareUrl(url);
      linkInput.current?.focus();
      linkInput.current?.select();
      setMessage("请选中下面的链接复制。");
    }
  }
  return (
    <div className="post-actions">
      <div className="post-actions-buttons">
        <button
          type="button"
          className={`post-action-button${liked ? " is-active" : ""}`}
          aria-pressed={liked}
          aria-label={`${liked ? "取消点赞" : "点赞"}，${count}人点赞`}
          disabled={busy}
          onClick={like}
        >
          <ThumbsUp size={16} aria-hidden="true" />
          {liked ? "已点赞" : "点赞"}
          <span>{count}</span>
        </button>
        <button
          type="button"
          className="post-action-button"
          disabled={sharing}
          aria-expanded={Boolean(shareUrl)}
          aria-controls={`share-${target}-${id}`}
          onClick={share}
        >
          <Share2 size={16} aria-hidden="true" />
          分享
        </button>
        <button
          type="button"
          className="post-action-button"
          disabled={sharing}
          onClick={copy}
        >
          <Copy size={15} aria-hidden="true" />
          复制链接
        </button>
      </div>
      {shareUrl && (
        <div className="post-share-panel" id={`share-${target}-${id}`}>
          <label className="sr-only" htmlFor={`share-link-${target}-${id}`}>
            分享链接
          </label>
          <input
            ref={linkInput}
            id={`share-link-${target}-${id}`}
            value={shareUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className="post-action-button"
            onClick={() => setShareUrl("")}
          >
            收起
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="post-actions-message muted">
          {message}
        </p>
      )}
    </div>
  );
}
