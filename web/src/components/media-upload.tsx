"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function MediaUpload() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(`上传完成。Markdown：![图片说明](${result.url})`);
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="search-form" onSubmit={upload}>
        <label className="sr-only" htmlFor="file">
          选择图片
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          required
        />
        <button className="button" disabled={busy}>
          {busy ? "上传中…" : "上传图片 →"}
        </button>
      </form>
      {message && (
        <div role="status" className="form-message">
          {message}
        </div>
      )}
    </>
  );
}
