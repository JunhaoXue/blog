import { requireAdmin } from "@/lib/authorization";
import { database } from "@/lib/database";
import { getCategories } from "@/lib/content";
import { SettingsForm } from "@/components/settings-form";
import { AdminAction } from "@/components/admin-action";
export default async function Settings() {
  await requireAdmin();
  const categories = getCategories();
  const links = database.prepare("SELECT * FROM links ORDER BY name").all() as {
    id: string;
    name: string;
    url: string;
    description: string;
  }[];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>分类与友链</h1>
          <p className="muted">让文章更容易找到，也为朋友留一个位置。</p>
        </div>
      </div>
      <section className="settings-section">
        <h2 className="sr-only">文章分类</h2>
        <SettingsForm type="category" />
        {categories.map((category) => (
          <div className="management-row" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <details>
                <summary className="muted">编辑</summary>
                <SettingsForm type="category" initial={category} />
              </details>
              <p>
                {category.slug} · {category.count} 篇公开文章
              </p>
            </div>
            <AdminAction
              data={{ type: "category", id: category.id }}
              method="DELETE"
              label="删除"
              confirmation="确认删除分类？有文章的分类需先转移文章。"
            />
          </div>
        ))}
      </section>
      <section className="settings-section">
        <h2 className="sr-only">友情链接</h2>
        <SettingsForm type="link" />
        {links.map((link) => (
          <div className="management-row" key={link.id}>
            <div>
              <strong>{link.name}</strong>
              <details>
                <summary className="muted">编辑</summary>
                <SettingsForm type="link" initial={link} />
              </details>
              <p>
                {link.url} · {link.description}
              </p>
            </div>
            <AdminAction
              data={{ type: "link", id: link.id }}
              method="DELETE"
              label="删除"
              confirmation="确认删除这个友链？"
            />
          </div>
        ))}
      </section>
    </>
  );
}
