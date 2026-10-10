import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
export async function POST(request: Request) {
  return endpoint(async () => {
    const session = await authorize(request);
    const { title, content } = z
      .object({
        title: z.string().trim().min(1).max(180),
        content: z.string().trim().min(1).max(20000),
      })
      .parse(await jsonBody(request));
    if (
      database
        .prepare(
          "SELECT id FROM discussions WHERE user_id=? AND created_at>? LIMIT 1",
        )
        .get(session.user.id, new Date(Date.now() - 60_000).toISOString())
    )
      throw new HttpError(429, "请稍等一分钟再发起话题。");
    const id = randomUUID(),
      now = new Date().toISOString();
    database
      .prepare(
        "INSERT INTO discussions (id,user_id,author,title,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(id, session.user.id, session.user.name, title, content, now, now);
    return { id };
  });
}
