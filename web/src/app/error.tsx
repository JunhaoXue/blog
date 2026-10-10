"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state full">
      <h1>暂时没能加载这一页。</h1>
      <p>请稍后重试，你的内容不会因此丢失。</p>
      <button className="button" onClick={reset}>
        重新加载
      </button>
    </div>
  );
}
