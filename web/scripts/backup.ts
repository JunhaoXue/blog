import { database } from "../src/lib/database";
import fs from "node:fs/promises";
import path from "node:path";
const output = path.resolve(
  process.argv[2] ||
    `data/backups/${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
await fs.mkdir(output, { recursive: true, mode: 0o700 });
await database.backup(path.join(output, "blog.sqlite"));
await fs.chmod(path.join(output, "blog.sqlite"), 0o600);
const uploads = process.env.UPLOADS_PATH || path.resolve("uploads");
try {
  await fs.cp(uploads, path.join(output, "uploads"), { recursive: true });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
console.log(`数据库在线快照及现有图片已备份：${output}`);
database.close();
