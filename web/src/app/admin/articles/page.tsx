import { requireAdmin } from "@/lib/authorization";
import Link from "next/link";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/site";
import { AdminAction } from "@/components/admin-action";
export default async function Articles() {
  await requireAdmin();
  const posts = getPosts(true);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>文章</h1>
          <p className="muted">
            共 {posts.length} 篇，包含草稿和定时发布的文章。
          </p>
        </div>
        <Link className="button" href="/admin/articles/new">
          ＋ 写文章
        </Link>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题 / 地址</th>
              <th>分类</th>
              <th>状态</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <strong>{post.title}</strong>
                  <div className="muted">
                    /{post.slug}
                    {post.demo ? " · 示例" : ""}
                  </div>
                </td>
                <td>{post.category}</td>
                <td>
                  <span className={`status ${post.status}`}>
                    {post.status === "draft"
                      ? "草稿"
                      : new Date(post.date) > new Date()
                        ? "定时发布"
                        : "已发布"}
                  </span>
                </td>
                <td>{formatDate(post.date)}</td>
                <td>
                  <div className="table-actions">
                    <Link
                      className="button secondary"
                      href={`/admin/articles/${post.id}`}
                    >
                      编辑
                    </Link>
                    <AdminAction
                      endpoint="/api/admin/articles"
                      data={{ id: post.id }}
                      method="DELETE"
                      label="删除"
                      confirmation="确认删除这篇文章及其评论？此操作无法撤销。"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
