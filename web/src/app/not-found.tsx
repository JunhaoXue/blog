import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state full">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>这页走丢了。</h1>
      <p>文章可能已移动或尚未公开。</p>
      <Link className="button" href="/">
        回到首页 →
      </Link>
    </div>
  );
}
