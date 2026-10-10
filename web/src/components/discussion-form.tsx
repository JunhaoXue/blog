"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function DiscussionForm() {
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData(form);
      const response = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      router.push(`/discussions/${result.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败。");
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="notice">
        <Link href="/login?next=/discussions">登录后发起一个话题 →</Link>
      </div>
    );
  return (
    <form className="discussion-compose" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="discussion-title">标题</label>
        <input id="discussion-title" name="title" required maxLength={180} />
      </div>
      <div className="form-field">
        <label htmlFor="discussion-content">想聊什么？（支持 Markdown）</label>
        <textarea
          id="discussion-content"
          name="content"
          required
          maxLength={20000}
        />
      </div>
      <button className="button" disabled={busy}>
        {busy ? "正在发布…" : "发起讨论 →"}
      </button>
      {message && (
        <div role="alert" className="form-message error">
          {message}
        </div>
      )}
    </form>
  );
}
