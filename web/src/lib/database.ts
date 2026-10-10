import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const filename =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data/blog.sqlite");
fs.mkdirSync(path.dirname(filename), { recursive: true });
const globalDatabase = globalThis as unknown as {
  blogDatabase?: Database.Database;
};
export const database = globalDatabase.blogDatabase ?? new Database(filename);
globalDatabase.blogDatabase = database;
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.pragma("busy_timeout = 5000");
// 首次并行构建各 worker 在模块加载时执行 deferred DDL，产生 SQLITE_BUSY。
// 迁移现在只在 setup 中执行，并提前取得写锁，运行和构建仅打开连接。
export function migrateBlogDatabase() {
  database
    .transaction(() => {
      database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT NOT NULL, content TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id),
      tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL CHECK(status IN ('draft','published')) DEFAULT 'draft',
      published_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL, author TEXT NOT NULL, content TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS articles_published ON articles(status, published_at);
    CREATE INDEX IF NOT EXISTS comments_article ON comments(article_id, approved, created_at);
    CREATE INDEX IF NOT EXISTS comments_user ON comments(user_id, created_at);
    CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS discussions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, author TEXT NOT NULL, title TEXT NOT NULL,
      content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS votes (
      user_id TEXT NOT NULL, comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE, PRIMARY KEY (user_id, comment_id)
    );
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY, discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL, author TEXT NOT NULL, content TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS replies_discussion ON replies(discussion_id, approved, created_at);
    INSERT OR IGNORE INTO schema_migrations(version) VALUES (1), (2);
  `);
      if (
        !database
          .prepare("SELECT version FROM schema_migrations WHERE version=3")
          .get()
      ) {
        database.exec(
          "ALTER TABLE articles ADD COLUMN github_records TEXT NOT NULL DEFAULT '[]'",
        );
        database
          .prepare("INSERT INTO schema_migrations(version) VALUES (3)")
          .run();
      }
      database.exec(`
        CREATE TABLE IF NOT EXISTS resume (
          id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL DEFAULT '',
          headline TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL DEFAULT '', photo_id TEXT REFERENCES media(id),
          published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
          revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT ''
        );
        INSERT OR IGNORE INTO resume(id) VALUES (1);
        INSERT OR IGNORE INTO schema_migrations(version) VALUES (4);
        CREATE TABLE IF NOT EXISTS article_likes (
          user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
          article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          PRIMARY KEY(user_id,article_id)
        );
        CREATE INDEX IF NOT EXISTS article_likes_article ON article_likes(article_id);
        CREATE TABLE IF NOT EXISTS discussion_likes (
          user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
          discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
          PRIMARY KEY(user_id,discussion_id)
        );
        CREATE INDEX IF NOT EXISTS discussion_likes_discussion ON discussion_likes(discussion_id);
        INSERT OR IGNORE INTO schema_migrations(version) VALUES (5);
      `);
    })
    .immediate();
}
