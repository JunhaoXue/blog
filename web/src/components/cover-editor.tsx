"use client";

import { useState } from "react";
import { ArticleCover } from "./article-cover";

export function CoverEditor({
  id,
  alt,
  disabled,
  onChange,
  onUploading,
}: {
  id: string | null;
  alt: string;
  disabled: boolean;
  onChange: (id: string | null, alt: string) => void;
  onUploading: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    onUploading(true);
    setMessage("");
    try {
      if (file.size > 10_000_000) throw new Error("封面不能超过 10 MB。");
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.id, alt);
      setMessage("封面已上传，保存文章后生效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败，请重试。");
    } finally {
      setUploading(false);
      onUploading(false);
      input.value = "";
    }
  }
  return (
    <fieldset
      className="cover-editor surface-card"
      disabled={disabled || uploading}
    >
      <legend className="sr-only">文章封面</legend>
      {id && (
        <ArticleCover id={id} alt={alt || "当前文章封面"} variant="preview" />
      )}
      <div className="form-field">
        <label htmlFor="cover-file">封面图</label>
        <input
          id="cover-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={upload}
        />
        <p className="muted">
          建议使用 16:9 横图，支持 10 MB 以内的 PNG、JPEG、WebP 和 GIF。
        </p>
      </div>
      {id && (
        <>
          <div className="form-field">
            <label htmlFor="cover-alt">图片说明</label>
            <input
              id="cover-alt"
              value={alt}
              maxLength={240}
              onChange={(event) => onChange(id, event.target.value)}
              placeholder="描述画面，便于使用屏幕阅读器的读者理解"
            />
          </div>
          <button
            type="button"
            className="small-link"
            onClick={() => onChange(null, "")}
          >
            移除封面
          </button>
        </>
      )}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </fieldset>
  );
}
