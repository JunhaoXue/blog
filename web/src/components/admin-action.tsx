"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminAction({
  endpoint = "/api/admin/manage",
  data,
  label,
  method = "POST",
  confirmation,
}: {
  endpoint?: string;
  data: Record<string, unknown>;
  label: string;
  method?: string;
  confirmation?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span>
      <button
        className={`button ${method === "DELETE" ? "danger" : "secondary"}`}
        onClick={run}
        disabled={busy}
      >
        {busy ? "请稍候…" : label}
      </button>
      {error && (
        <span role="alert" className="form-message error">
          {error}
        </span>
      )}
    </span>
  );
}
