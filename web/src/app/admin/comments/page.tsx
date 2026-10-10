import { requireAdmin } from "@/lib/authorization";
import { database } from "@/lib/database";
import { formatDate } from "@/lib/site";
import { AdminAction } from "@/components/admin-action";
export default async function Moderation() {
  await requireAdmin();
  const comments = database
    .prepare(
      `SELECT c.*,'comment' AS type,a.title FROM comments c JOIN articles a ON a.id=c.article_id UNION ALL SELECT r.id,r.discussion_id,r.user_id,r.author,r.content,r.approved,r.created_at,'reply' AS type,d.title FROM replies r JOIN discussions d ON d.id=r.discussion_id ORDER BY created_at DESC`,
    )
    .all() as {
    id: string;
    author: string;
    content: string;
    title: string;
    created_at: string;
    approved: number;
    type: "comment" | "reply";
  }[];
  const discussions = database
    .prepare("SELECT * FROM discussions ORDER BY created_at DESC")
    .all() as { id: string; author: string; title: string }[];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>评论与讨论</h1>
          <p className="muted">
            普通读者评论审核后显示。已通过的评论可以隐藏。
          </p>
        </div>
      </div>
      {comments.map((comment) => (
        <div className="management-row" key={comment.id}>
          <div>
            <strong>
              {comment.author} · {comment.title}
            </strong>
            <p>{comment.content}</p>
            <span className="muted">
              {formatDate(comment.created_at)} ·{" "}
              {comment.approved ? "已公开" : "待审核"}
            </span>
          </div>
          <div className="table-actions">
            <AdminAction
              data={{
                type: comment.type,
                id: comment.id,
                approved: !comment.approved,
              }}
              label={comment.approved ? "隐藏" : "通过"}
            />
            <AdminAction
              data={{ type: comment.type, id: comment.id }}
              method="DELETE"
              label="删除"
              confirmation="确认永久删除这条评论？"
            />
          </div>
        </div>
      ))}
      {!comments.length && <div className="empty-state">还没有评论。</div>}
      <h2 className="sr-only">讨论区话题</h2>
      {discussions.map((item) => (
        <div className="management-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.author}</p>
          </div>
          <AdminAction
            data={{ type: "discussion", id: item.id }}
            method="DELETE"
            label="删除"
            confirmation="确认删除这个话题？"
          />
        </div>
      ))}
    </>
  );
}
