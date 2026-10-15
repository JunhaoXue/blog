import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
import { articleText, makeAnchor } from "@/lib/annotations";
export async function POST(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { articleId, content, target, anchor, parentId } = z
      .object({
        articleId: z.string().min(1),
        target: z.enum(["article", "discussion"]).default("article"),
        parentId: z.string().min(1).optional(),
        anchor: z
          .object({
            exact: z.string().min(1).max(2000, "一次最多选择 2000 字。"),
            prefix: z.string().max(64),
            suffix: z.string().max(64),
            start: z.number().int().min(0),
            end: z.number().int().min(1),
            revision: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .optional(),
        content: z
          .string()
          .trim()
          .min(1, "请输入评论。")
          .max(3000, "评论最多 3000 字。"),
      })
      .parse(await jsonBody(request));
    const post =
      target === "article"
        ? database
            .prepare(
              "SELECT id,content FROM articles WHERE id=? AND status='published' AND published_at<=?",
            )
            .get(articleId, new Date().toISOString())
        : database
            .prepare("SELECT id FROM discussions WHERE id=?")
            .get(articleId);
    if (!post) throw new HttpError(404, "文章不存在。");
    if ((target !== "article" && (anchor || parentId)) || (anchor && parentId))
      throw new HttpError(400, "划线评论参数无效。");
    if (anchor) {
      const source = (post as { content: string }).content;
      const revision = createHash("sha256").update(source).digest("hex");
      if (revision !== anchor.revision)
        throw new HttpError(
          409,
          "文章已更新，请刷新后重新选择原文。你的评论尚未提交。",
        );
      const text = articleText(source);
      const expected = makeAnchor(text, anchor.start, anchor.end, revision);
      if (
        anchor.end <= anchor.start ||
        anchor.end > text.length ||
        !anchor.exact.trim() ||
        expected.exact !== anchor.exact ||
        expected.prefix !== anchor.prefix ||
        expected.suffix !== anchor.suffix
      )
        throw new HttpError(400, "选中文字与原文不匹配，请重新选择。");
    }
    if (
      parentId &&
      !database
        .prepare(
          "SELECT id FROM comments WHERE id=? AND article_id=? AND approved=1 AND anchor IS NOT NULL AND parent_id IS NULL",
        )
        .get(parentId, articleId)
    )
      throw new HttpError(404, "这条划线评论已隐藏或删除，请刷新页面。");
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
    const id = randomUUID();
    database
      .prepare(
        target === "article"
          ? "INSERT INTO comments (id,article_id,user_id,author,content,approved,created_at,anchor,parent_id) VALUES (?,?,?,?,?,?,?,?,?)"
          : "INSERT INTO replies (id,discussion_id,user_id,author,content,approved,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        id,
        articleId,
        session.user.id,
        session.user.name,
        content,
        approved,
        new Date().toISOString(),
        ...(target === "article"
          ? [anchor ? JSON.stringify(anchor) : null, parentId || null]
          : []),
      );
    return { id, approved: Boolean(approved) };
  });
}
export async function PATCH(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { id } = z
      .object({ id: z.string().min(1) })
      .parse(await jsonBody(request));
    // 旧点赞接口仅检查评论 approved，文章撤回后仍可凭评论 ID 点赞。
    // 本次线程审核验收补齐文章及父评论的公开条件，隐藏整段讨论即不可交互。
    if (
      !database
        .prepare(
          `SELECT c.id FROM comments c JOIN articles a ON a.id=c.article_id
          WHERE c.id=? AND c.approved=1 AND a.status='published' AND a.published_at<=?
          AND (c.parent_id IS NULL OR EXISTS (SELECT 1 FROM comments p WHERE p.id=c.parent_id AND p.approved=1))`,
        )
        .get(id, new Date().toISOString())
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
