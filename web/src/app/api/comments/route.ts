import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
export async function POST(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { articleId, content, target } = z
      .object({
        articleId: z.string().min(1),
        target: z.enum(["article", "discussion"]).default("article"),
        content: z
          .string()
          .trim()
          .min(1, "请输入评论。")
          .max(3000, "评论最多 3000 字。"),
      })
      .parse(await jsonBody(request));
    if (
      !(target === "article"
        ? database
            .prepare(
              "SELECT id FROM articles WHERE id=? AND status='published' AND published_at<=?",
            )
            .get(articleId, new Date().toISOString())
        : database
            .prepare("SELECT id FROM discussions WHERE id=?")
            .get(articleId))
    )
      throw new HttpError(404, "文章不存在。");
    if (
      database
        .prepare(
          "SELECT id FROM comments WHERE user_id=? AND created_at>? UNION ALL SELECT id FROM replies WHERE user_id=? AND created_at>? LIMIT 1",
        )
        .get(
          session.user.id,
          new Date(Date.now() - 60_000).toISOString(),
          session.user.id,
          new Date(Date.now() - 60_000).toISOString(),
        )
    )
      throw new HttpError(429, "请稍等一分钟再发表评论。");
    const approved = session.user.role === "admin" ? 1 : 0;
    database
      .prepare(
        target === "article"
          ? "INSERT INTO comments (id,article_id,user_id,author,content,approved,created_at) VALUES (?,?,?,?,?,?,?)"
          : "INSERT INTO replies (id,discussion_id,user_id,author,content,approved,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        articleId,
        session.user.id,
        session.user.name,
        content,
        approved,
        new Date().toISOString(),
      );
    return { approved: Boolean(approved) };
  });
}
export async function PATCH(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { id } = z
      .object({ id: z.string().min(1) })
      .parse(await jsonBody(request));
    if (
      !database
        .prepare("SELECT id FROM comments WHERE id=? AND approved=1")
        .get(id)
    )
      throw new HttpError(404, "评论不存在。");
    database.transaction(() => {
      const removed = database
        .prepare("DELETE FROM votes WHERE user_id=? AND comment_id=?")
        .run(session.user.id, id);
      if (!removed.changes)
        database
          .prepare("INSERT INTO votes (user_id,comment_id) VALUES (?,?)")
          .run(session.user.id, id);
    })();
    return { ok: true };
  });
}
