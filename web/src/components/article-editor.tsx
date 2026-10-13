"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Post } from "@/lib/content";
import { GitHubRecords } from "@/components/github-records";
import type { GitHubRecord } from "@/lib/github-records";
import { CoverEditor } from "./cover-editor";
export function ArticleEditor({
  post,
  categories,
}: {
  post?: Post;
  categories: { id: string; name: string }[];
}) {
  const [content, setContent] = useState(post?.content || "");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [coverId, setCoverId] = useState(post?.coverId || null);
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt || "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [githubRecords, setGithubRecords] = useState<GitHubRecord[]>(
    post?.githubRecords || [],
  );
  const router = useRouter();
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
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploadingCover) return;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const body = {
        id: post?.id,
        title: data.get("title"),
        slug: data.get("slug"),
        description: data.get("description"),
        content,
        categoryId: data.get("categoryId"),
        tags: String(data.get("tags"))
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: data.get("status"),
        date: new Date(String(data.get("date"))).toISOString(),
        updatedAt: post?.updatedAt,
        githubRecords,
        coverId,
        coverAlt,
      };
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDirty(false);
      setMessage("文章已保存。");
      router.replace(`/admin/articles/${result.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  const localDate = () => {
    const date = new Date(post?.date || Date.now());
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>{post ? "编辑文章" : "写一篇文章"}</h1>
        </div>
        <Link
          href="/admin/articles"
          className="small-link"
          onClick={(event) => {
            if (dirty && !window.confirm("有未保存的修改，确认离开？"))
              event.preventDefault();
          }}
        >
          返回列表
        </Link>
      </div>
      {!categories.length && (
        <div className="notice">
          请先在<Link href="/admin/settings">分类与友链</Link>
          中创建分类。
        </div>
      )}
      <form onSubmit={save} onChange={() => setDirty(true)}>
        <CoverEditor
          id={coverId}
          alt={coverAlt}
          disabled={busy}
          onUploading={setUploadingCover}
          onChange={(id, alt) => {
            setCoverId(id);
            setCoverAlt(alt);
            setDirty(true);
          }}
        />
        <div className="form-field">
          <label htmlFor="title">标题</label>
          <input
            id="title"
            name="title"
            defaultValue={post?.title}
            required
            maxLength={180}
            placeholder="给这个想法起个名字"
          />
        </div>
        <div className="editor-grid">
          <div className="form-field">
            <label htmlFor="slug">文章地址（小写英文、数字、连字符）</label>
            <input
              id="slug"
              name="slug"
              defaultValue={post?.slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={120}
              placeholder="my-first-post"
            />
          </div>
          <div className="form-field">
            <label htmlFor="categoryId">分类</label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={post?.categoryId}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="description">摘要</label>
          <textarea
            id="description"
            name="description"
            defaultValue={post?.description}
            maxLength={500}
            rows={2}
          />
        </div>
        <div className="editor-grid">
          <div className="form-field">
            <label htmlFor="tags">标签（用逗号分隔）</label>
            <input
              id="tags"
              name="tags"
              defaultValue={post?.tags.join(", ")}
              placeholder="技术, 写作"
            />
          </div>
          <div className="form-field">
            <label htmlFor="date">
              发布时间（本机时区，未来时间将定时公开）
            </label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              defaultValue={localDate()}
              required
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="content">正文 · Markdown</label>
          <textarea
            className="editor-body"
            id="content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setDirty(true);
            }}
            required
            placeholder="从这里开始写…"
            maxLength={200000}
          />
        </div>
        <p className="muted">
          图片先在“图片”页面上传，再把生成的 Markdown 粘贴到正文。
        </p>
        <button
          type="button"
          className="button secondary"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "收起预览" : "预览排版"}
        </button>
        {preview && (
          <div className="editor-preview prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        <fieldset className="github-editor">
          <legend className="sr-only">GitHub 记录</legend>
          <p className="muted">
            关联这篇文章的仓库、提交或 PR，最多 12 条；按添加顺序展示。
          </p>
          {githubRecords.map((record, index) => (
            <div className="github-editor-row" key={index}>
              <div className="editor-grid">
                <div className="form-field">
                  <label htmlFor={`github-title-${index}`}>
                    记录 {index + 1} · 说明（选填）
                  </label>
                  <input
                    id={`github-title-${index}`}
                    value={record.title}
                    maxLength={120}
                    placeholder="例如：实现文章评论功能"
                    onChange={(event) =>
                      setGithubRecords((records) =>
                        records.map((item, i) =>
                          i === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`github-url-${index}`}>GitHub 地址</label>
                  <input
                    id={`github-url-${index}`}
                    type="url"
                    value={record.url}
                    required
                    maxLength={500}
                    placeholder="https://github.com/JunhaoXue/blog"
                    onChange={(event) =>
                      setGithubRecords((records) =>
                        records.map((item, i) =>
                          i === index
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className="small-link"
                aria-label={`移除 GitHub 记录 ${index + 1}`}
                onClick={() => {
                  setGithubRecords((records) =>
                    records.filter((_, i) => i !== index),
                  );
                  setDirty(true);
                }}
              >
                移除记录
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={githubRecords.length >= 12}
            onClick={() => {
              setGithubRecords((records) => [
                ...records,
                { title: "", url: "" },
              ]);
              setDirty(true);
            }}
          >
            + 添加 GitHub 记录
          </button>
          {preview && <GitHubRecords records={githubRecords} />}
        </fieldset>
        <div className="editor-actions">
          <label htmlFor="status">发布状态</label>
          <select
            id="status"
            name="status"
            defaultValue={post?.status || "draft"}
            style={{ width: 140 }}
          >
            <option value="draft">草稿</option>
            <option value="published">公开发布</option>
          </select>
          <button
            className="button"
            disabled={busy || uploadingCover || !categories.length}
          >
            {busy ? "正在保存…" : "保存文章 →"}
          </button>
        </div>
        {message && (
          <div role="status" className="form-message">
            {message}
          </div>
        )}
      </form>
    </>
  );
}
