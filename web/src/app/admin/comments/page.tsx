import { requireAdmin } from "@/lib/authorization";
import { database } from "@/lib/database";
import { formatDate } from "@/lib/site";
import { AdminAction } from "@/components/admin-action";
import type { TextAnchor } from "@/lib/annotations";
export default async function Moderation() {
  await requireAdmin();
  // 划线回复加入自连接后，SQLite UNION 的 ORDER BY 不再识别未取别名的
  // c.created_at；隔离验收发现审核页报错，现显式命名共同的排序列。
  const comments = database
    .prepare(
      `SELECT c.id,c.author,c.content,c.approved,c.created_at AS created_at,'comment' AS type,a.title,
        COALESCE(c.anchor,p.anchor) AS anchor,c.parent_id AS parentId,p.approved AS parentApproved
        FROM comments c JOIN articles a ON a.id=c.article_id LEFT JOIN comments p ON p.id=c.parent_id
        UNION ALL SELECT r.id,r.author,r.content,r.approved,r.created_at,'reply' AS type,d.title,
        NULL AS anchor,NULL AS parentId,NULL AS parentApproved FROM replies r JOIN discussions d ON d.id=r.discussion_id
        ORDER BY created_at DESC`,
    )
    .all() as {
    id: string;
    author: string;
    content: string;
    title: string;
    created_at: string;
    approved: number;
    type: "comment" | "reply";
    anchor: string | null;
    parentId: string | null;
    parentApproved: number | null;
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
            {comment.anchor && (
              <blockquote className="comment-quote">
                {(JSON.parse(comment.anchor) as TextAnchor).exact}
              </blockquote>
            )}
            <p>{comment.content}</p>
            <span className="muted">
              {formatDate(comment.created_at)} ·{" "}
              {comment.approved ? "已公开" : "待审核"}
              {comment.parentId && " · 划线回复"}
              {comment.parentId &&
                !comment.parentApproved &&
                " · 原评论已隐藏，回复也不公开"}
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
