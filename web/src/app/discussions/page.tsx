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
        <span className="eyebrow">LET’S TALK ABOUT IT</span>
        <h1>
          一起聊聊<span className="accent">.</span>
        </h1>
        <p>一个问题、一点观察，或者一个还没想明白的念头。</p>
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
          <p>{item.content.slice(0, 140)}</p>
        </Link>
      ))}
      {!discussions.length && (
        <div className="empty-state">还没有话题，欢迎开启第一场讨论。</div>
      )}
    </div>
  );
}
