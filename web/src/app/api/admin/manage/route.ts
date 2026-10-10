import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "地址仅允许小写字母、数字和连字符。")
  .max(100);
const input = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("category"),
    id: z.string().optional(),
    name: z.string().trim().min(1).max(40),
    slug,
  }),
  z.object({
    type: z.literal("link"),
    id: z.string().optional(),
    name: z.string().trim().min(1).max(100),
    url: z
      .url()
      .refine(
        (url) => ["http:", "https:"].includes(new URL(url).protocol),
        "链接需以 http:// 或 https:// 开头。",
      ),
    description: z.string().max(300),
  }),
  z.object({
    type: z.enum(["comment", "reply"]),
    id: z.string(),
    approved: z.boolean(),
  }),
  z.object({
    type: z.literal("user"),
    id: z.string(),
    role: z.enum(["admin", "reader"]),
  }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const data = input.parse(await jsonBody(request));
    if (data.type === "category") {
      if (data.id)
        database
          .prepare("UPDATE categories SET name=?,slug=? WHERE id=?")
          .run(data.name, data.slug, data.id);
      else
        database
          .prepare("INSERT INTO categories (id,name,slug) VALUES (?,?,?)")
          .run(randomUUID(), data.name, data.slug);
    } else if (data.type === "link") {
      if (data.id)
        database
          .prepare("UPDATE links SET name=?,url=?,description=? WHERE id=?")
          .run(data.name, data.url, data.description, data.id);
      else
        database
          .prepare(
            "INSERT INTO links (id,name,url,description) VALUES (?,?,?,?)",
          )
          .run(randomUUID(), data.name, data.url, data.description);
    } else if (data.type === "comment" || data.type === "reply") {
      if (
        !database
          .prepare(
            `UPDATE ${data.type === "comment" ? "comments" : "replies"} SET approved=? WHERE id=?`,
          )
          .run(data.approved ? 1 : 0, data.id).changes
      )
        throw new HttpError(404, "评论不存在。");
    } else if (data.type === "user") {
      const user = database
        .prepare("SELECT role FROM user WHERE id=?")
        .get(data.id) as { role: string } | undefined;
      if (!user) throw new HttpError(404, "用户不存在。");
      if (
        user.role === "admin" &&
        data.role === "reader" &&
        (
          database
            .prepare("SELECT COUNT(*) AS count FROM user WHERE role='admin'")
            .get() as { count: number }
        ).count <= 1
      )
        throw new HttpError(409, "至少保留一位管理员。");
      database.transaction(() => {
        database
          .prepare("UPDATE user SET role=? WHERE id=?")
          .run(data.role, data.id);
        database.prepare("DELETE FROM session WHERE userId=?").run(data.id);
      })();
    }
    return { ok: true };
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const data = z
      .object({
        type: z.enum(["category", "link", "comment", "discussion", "reply"]),
        id: z.string().min(1),
      })
      .parse(await jsonBody(request));
    const tables = {
      category: "categories",
      link: "links",
      comment: "comments",
      discussion: "discussions",
      reply: "replies",
    } as const;
    if (
      !database
        .prepare(`DELETE FROM ${tables[data.type]} WHERE id=?`)
        .run(data.id).changes
    )
      throw new HttpError(404, "记录不存在。");
    return { ok: true };
  });
}
