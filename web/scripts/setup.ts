import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { parse } from "yaml";

const envFile = path.resolve(".env.local");
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(
    envFile,
    `BETTER_AUTH_SECRET=${randomBytes(48).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3000\nDATABASE_PATH=${path.resolve("data/blog.sqlite")}\n`,
    { mode: 0o600 },
  );
}
process.loadEnvFile(envFile);
const { database, migrateBlogDatabase } = await import("../src/lib/database");
migrateBlogDatabase();
const { authOptions } = await import("../src/lib/auth-options");
const { getMigrations } = await import("better-auth/db/migration");
await (await getMigrations(authOptions)).runMigrations();
const { auth } = await import("../src/lib/auth");
await auth.$context;
const existing = database
  .prepare("SELECT id FROM user WHERE role='admin' LIMIT 1")
  .get();
if (!existing) {
  const email = process.env.ADMIN_EMAIL || "admin@xuejunhao.com";
  const password =
    process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
  const account = await auth.api.signUpEmail({
    body: { email, password, name: "Junhao Xue" },
  });
  database
    .prepare("UPDATE user SET role='admin' WHERE id=?")
    .run(account.user.id);
  if (!process.env.ADMIN_PASSWORD) {
    fs.writeFileSync(
      process.env.ADMIN_CREDENTIAL_FILE || "local-admin.txt",
      `本机管理账号\n地址：http://localhost:3000/login\n邮箱：${email}\n密码：${password}\n请登录后修改密码，勿提交此文件。\n`,
      { mode: 0o600 },
    );
    console.log(
      "管理员已创建；初始密码保存在 web/local-admin.txt（权限 600，Git 忽略）。",
    );
  } else console.log("管理员已创建，使用环境变量提供的初始密码。");
}
if (
  !database
    .prepare("SELECT version FROM schema_migrations WHERE version=100")
    .get() &&
  !database.prepare("SELECT id FROM articles LIMIT 1").get()
) {
  database.transaction(() => {
    for (const file of fs
      .readdirSync("content/posts")
      .filter((f) => f.endsWith(".md"))) {
      const source = fs.readFileSync(`content/posts/${file}`, "utf8");
      const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
      if (!match) throw new Error(`Invalid front matter: ${file}`);
      const data = parse(match[1]);
      const content = match[2];
      const categorySlug = (
        {
          技术: "technology",
          产品: "product",
          随笔: "notes",
        } as Record<string, string>
      )[data.category];
      database
        .prepare(
          "INSERT OR IGNORE INTO categories (id,name,slug) VALUES (?,?,?)",
        )
        .run(categorySlug, data.category, categorySlug);
      const now = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO articles (id,slug,title,description,content,category_id,tags,status,published_at,created_at,updated_at,demo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          randomUUID(),
          file.slice(0, -3),
          data.title,
          data.description,
          content,
          categorySlug,
          JSON.stringify(data.tags),
          "published",
          new Date(data.date).toISOString(),
          now,
          now,
          1,
        );
    }
  })();
  console.log("已导入三篇明确标注的示例文章，可在后台替换或删除。");
}
database
  .prepare("INSERT OR IGNORE INTO schema_migrations(version) VALUES (100)")
  .run();
console.log("数据库与认证结构已就绪；重复运行不会重置账号或文章。");
// SDK 在 context 就绪后仍异步核对结构；此前立刻关闭连接造成错误日志。
// 保持连接到初始化进程自然退出，避免中断官方验证。
