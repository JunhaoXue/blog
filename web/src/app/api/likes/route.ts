import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
import { getPostReactions, reactionTables } from "@/lib/post-reactions";

export async function PUT(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { target, id, liked } = z
      .object({
        target: z.enum(["article", "discussion"]),
        id: z.string().min(1).max(120),
        liked: z.boolean(),
      })
      .parse(await jsonBody(request));
    return database
      .transaction(() => {
        const exists =
          target === "article"
            ? database
                .prepare(
                  "SELECT id FROM articles WHERE id=? AND status='published' AND published_at<=?",
                )
                .get(id, new Date().toISOString())
            : database.prepare("SELECT id FROM discussions WHERE id=?").get(id);
        if (!exists) throw new HttpError(404, "帖子不存在。");
        const { table, column } = reactionTables[target];
        if (liked)
          database
            .prepare(
              `INSERT OR IGNORE INTO ${table}(user_id,${column}) VALUES (?,?)`,
            )
            .run(session.user.id, id);
        else
          database
            .prepare(`DELETE FROM ${table} WHERE user_id=? AND ${column}=?`)
            .run(session.user.id, id);
        return getPostReactions(target, id, session.user.id);
      })
      .immediate();
  });
}
