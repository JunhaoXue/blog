import { requireAdmin } from "@/lib/authorization";
import { database } from "@/lib/database";
import { AdminAction } from "@/components/admin-action";
export default async function Users() {
  await requireAdmin();
  const users = database
    .prepare("SELECT id,name,email,role FROM user ORDER BY createdAt DESC")
    .all() as { id: string; name: string; email: string; role: string }[];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>读者与权限</h1>
          <p className="muted">
            管理员可以管理全部内容。权限变更会退出该账号的现有登录。
          </p>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>名字</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role === "admin" ? "管理员" : "读者"}</td>
                <td>
                  <AdminAction
                    data={{
                      type: "user",
                      id: user.id,
                      role: user.role === "admin" ? "reader" : "admin",
                    }}
                    label={user.role === "admin" ? "改为读者" : "设为管理员"}
                    confirmation={`确认修改 ${user.name} 的权限？`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
