"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { IconLabel } from "./icon-label";
export function SettingsForm({
  type,
  initial,
}: {
  type: "category" | "link";
  initial?: {
    id: string;
    name: string;
    slug?: string;
    url?: string;
    description?: string;
  };
}) {
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
      const body = { type, id: initial?.id, ...Object.fromEntries(data) };
      const response = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!initial) form.reset();
      setMessage("已保存。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="inline-form" onSubmit={submit}>
        <div className="form-field">
          <label htmlFor={`${type}-${initial?.id || "new"}-name`}>名称</label>
          <input
            id={`${type}-${initial?.id || "new"}-name`}
            name="name"
            defaultValue={initial?.name}
            required
            maxLength={type === "category" ? 40 : 100}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${type}-${initial?.id || "new"}-address`}>
            {type === "category" ? "地址（英文）" : "网址"}
          </label>
          <input
            id={`${type}-${initial?.id || "new"}-address`}
            name={type === "category" ? "slug" : "url"}
            defaultValue={type === "category" ? initial?.slug : initial?.url}
            type={type === "category" ? "text" : "url"}
            required
            placeholder={type === "category" ? "technology" : "https://"}
            pattern={type === "category" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
          />
        </div>
        {type === "link" && (
          <div className="form-field">
            <label htmlFor={`link-${initial?.id || "new"}-description`}>
              简介
            </label>
            <input
              id={`link-${initial?.id || "new"}-description`}
              name="description"
              maxLength={300}
              defaultValue={initial?.description}
            />
          </div>
        )}
        <button className="button" disabled={busy}>
          {busy ? (
            "保存中…"
          ) : (
            <IconLabel icon={ArrowRight}>
              {initial ? "保存修改" : "添加"}
            </IconLabel>
          )}
        </button>
      </form>
      {message && (
        <div role="alert" className="form-message error">
          {message}
        </div>
      )}
    </>
  );
}
