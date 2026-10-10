import Link from "next/link";
import { database } from "@/lib/database";
import { DiscussionForm } from "@/components/discussion-form";
import { formatDate } from "@/lib/site";
export const metadata = { title: "讨论" };
export default function Discussions() {
  const discussions = database
    .prepare("SELECT * FROM discussions ORDER BY created_at DESC LIMIT 100")
    .all() as {
    id: string;
    title: string;
    author: string;
    content: string;
    created_at: string;
  }[];
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>讨论</h1>
      </div>
      <DiscussionForm />
      {discussions.map((item) => (
        <Link
          className="discussion-row"
          key={item.id}
          href={`/discussions/${item.id}`}
        >
          <span className="post-meta">
            {item.author} · {formatDate(item.created_at)}
          </span>
          <h2>{item.title} ↗</h2>
        </Link>
      ))}
      {!discussions.length && (
        <div className="empty-state">还没有话题，欢迎开启第一场讨论。</div>
      )}
    </div>
  );
}
