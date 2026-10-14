"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Resume } from "@/lib/resume";
import { ResumeView } from "./resume-view";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { IconLabel } from "./icon-label";

export function ResumeEditor({
  initial,
  media,
}: {
  initial: Resume;
  media: { id: string; filename: string }[];
}) {
  const [resume, setResume] = useState(initial);
  const [photos, setPhotos] = useState(media);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const locked = busy || uploading;
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function change<K extends keyof Resume>(key: K, value: Resume[K]) {
    setResume((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setMessage("");
    setFailed(false);
    setUploading(true);
    try {
      if (file.size > 10_000_000) throw new Error("照片不能超过 10 MB。");
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPhotos((current) => [
        { id: result.id, filename: file.name },
        ...current,
      ]);
      change("photoId", result.id);
      setMessage("照片已上传，保存简历后生效。");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "照片上传失败。");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setResume((current) => ({ ...current, revision: result.revision }));
      setDirty(false);
      setMessage(
        resume.published
          ? "简历已保存并公开。"
          : "简历草稿已保存，访客不可见。",
      );
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <h1>简历</h1>
        <Link
          href="/resume"
          className="small-link"
          onClick={(event) => {
            if (dirty && !window.confirm("有未保存的修改，确认离开？"))
              event.preventDefault();
          }}
        >
          <IconLabel icon={ArrowUpRight}>查看公开页面</IconLabel>
        </Link>
      </div>
      <form onSubmit={save}>
        <fieldset className="resume-fields" disabled={locked}>
          <legend className="sr-only">编辑简历</legend>
          <div className="resume-photo-editor surface-card">
            {resume.photoId && (
              <img
                className="resume-photo"
                src={`/api/media/${resume.photoId}`}
                alt="当前简历照片"
                width={144}
                height={144}
              />
            )}
            <div className="resume-photo-controls">
              <div className="form-field">
                <label htmlFor="resume-photo-upload">上传照片</label>
                <input
                  id="resume-photo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={upload}
                  aria-describedby="resume-photo-help"
                />
              </div>
              <p id="resume-photo-help" className="muted">
                支持 PNG、JPEG、GIF、WebP，最多 10 MB。
              </p>
              <div className="form-field">
                <label htmlFor="resume-photo-select">或使用已上传的图片</label>
                <select
                  id="resume-photo-select"
                  value={resume.photoId || ""}
                  onChange={(event) =>
                    change("photoId", event.target.value || null)
                  }
                >
                  <option value="">不显示照片</option>
                  {photos.map((photo) => (
                    <option value={photo.id} key={photo.id}>
                      {photo.filename}
                    </option>
                  ))}
                </select>
              </div>
              {resume.photoId && (
                <button
                  type="button"
                  className="small-link"
                  onClick={() => change("photoId", null)}
                >
                  移除照片
                </button>
              )}
            </div>
          </div>
          <div className="editor-grid">
            <div className="form-field">
              <label htmlFor="resume-name">姓名</label>
              <input
                id="resume-name"
                required
                maxLength={100}
                value={resume.name}
                onChange={(event) => change("name", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="resume-headline">职位或身份（选填）</label>
              <input
                id="resume-headline"
                maxLength={160}
                value={resume.headline}
                onChange={(event) => change("headline", event.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="resume-summary">个人简介（选填）</label>
            <textarea
              id="resume-summary"
              rows={3}
              maxLength={500}
              value={resume.summary}
              onChange={(event) => change("summary", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="resume-content">履历 · Markdown</label>
            <textarea
              id="resume-content"
              className="editor-body"
              required={resume.published}
              maxLength={100_000}
              value={resume.content}
              onChange={(event) => change("content", event.target.value)}
              placeholder="填写工作经历和代表作品…"
            />
            <p className="muted resume-format-help">
              在“工作经历”和“作品”二级标题下，用加粗名称、换行时间和介绍组织条目；作品可插入截图与访问链接。
            </p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => setPreview((current) => !current)}
          >
            {preview ? "收起预览" : "预览简历"}
          </button>
          {preview && (
            <div className="editor-preview">
              <ResumeView resume={resume} />
            </div>
          )}
          <p className="muted resume-publish-help">
            公开发布后，照片和履历将对所有访客可见；草稿仅在后台保存。
          </p>
          <div className="editor-actions">
            <label htmlFor="resume-status">发布状态</label>
            <select
              id="resume-status"
              value={resume.published ? "published" : "draft"}
              onChange={(event) =>
                change("published", event.target.value === "published")
              }
            >
              <option value="draft">草稿</option>
              <option value="published">公开发布</option>
            </select>
            <button className="button" disabled={locked}>
              {uploading ? (
                "照片上传中…"
              ) : busy ? (
                "保存中…"
              ) : (
                <IconLabel icon={ArrowRight}>保存简历</IconLabel>
              )}
            </button>
          </div>
        </fieldset>
        {message && (
          <div
            role={failed ? "alert" : "status"}
            className={`form-message${failed ? " error" : ""}`}
          >
            {message}
          </div>
        )}
      </form>
    </>
  );
}
