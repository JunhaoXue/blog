import { requireAdmin } from "@/lib/authorization";
import Link from "next/link";
import { database } from "@/lib/database";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/site";
const count = (sql: string) =>
  (database.prepare(sql).get() as { count: number }).count;
export default async function Dashboard() {
  await requireAdmin();
  const posts = getPosts(true);
  const stats = [
    ["文章", posts.length],
    ["公开文章", getPosts().length],
    [
      "待审核评论",
      count(
        "SELECT (SELECT COUNT(*) FROM comments WHERE approved=0)+(SELECT COUNT(*) FROM replies WHERE approved=0) AS count",
      ),
    ],
    ["读者账号", count("SELECT COUNT(*) AS count FROM user")],
  ];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>写作工作台</h1>
        </div>
        <Link className="button" href="/admin/articles/new">
          ＋ 写文章
        </Link>
      </div>
      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div className="stat-card surface-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="notice">
        新版已就绪。预置内容均为示例文章，可在文章管理中替换或删除。正式写作从“写文章”开始。
      </div>
      <h2 className="sr-only">最近的文章</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>日期</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.slice(0, 5).map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>
                  <span className={`status ${post.status}`}>
                    {post.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td>{formatDate(post.date)}</td>
                <td>
                  <Link href={`/admin/articles/${post.id}`}>编辑 ↗</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
