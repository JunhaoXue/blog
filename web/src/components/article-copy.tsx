"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

export function ArticleCopy({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const manualCopy = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
    } catch {
      dialog.current?.showModal();
      manualCopy.current?.focus();
      manualCopy.current?.select();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="article-copy">
      <button
        type="button"
        className="article-copy-button"
        onClick={copy}
        disabled={busy}
        aria-label="复制文章全文为 Markdown"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span aria-live="polite">{copied ? "已复制" : "复制全文"}</span>
      </button>
      <dialog
        ref={dialog}
        className="article-copy-dialog"
        aria-labelledby="article-copy-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="article-copy-dialog-heading">
          <h2 id="article-copy-title">复制全文</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭复制全文"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p id="article-copy-help">
          浏览器未允许自动复制，请复制下方已选中的文章。
        </p>
        <textarea
          ref={manualCopy}
          value={markdown}
          readOnly
          aria-label="文章 Markdown 全文"
          aria-describedby="article-copy-help"
        />
      </dialog>
    </div>
  );
}
