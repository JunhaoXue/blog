import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
import { githubRecordsSchema } from "@/lib/github-records";
const input = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "请输入标题。").max(180),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "文章地址仅允许小写字母、数字和连字符。",
    )
    .max(120),
  description: z.string().trim().max(500),
  content: z.string().min(1, "请输入正文。").max(200_000),
  categoryId: z.string().min(1, "请选择分类。"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  status: z.enum(["draft", "published"]),
  date: z.iso.datetime({ offset: true }),
  updatedAt: z.string().optional(),
  githubRecords: githubRecordsSchema.default([]),
  coverId: z.uuid().nullable().optional(),
  coverAlt: z.string().trim().max(240).optional(),
});
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const data = input.parse(await jsonBody(request));
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    return database
      .transaction(() => {
        if (
          data.coverId &&
          !database.prepare("SELECT id FROM media WHERE id=?").get(data.coverId)
        )
          throw new HttpError(400, "封面不存在，请重新上传或选择。");
        if (data.id) {
          const result = database
            .prepare(
              `UPDATE articles SET title=?,slug=?,description=?,content=?,category_id=?,
        tags=?,status=?,published_at=?,updated_at=?,github_records=?,
        cover_media_id=CASE WHEN ? THEN ? ELSE cover_media_id END,
        cover_alt=CASE WHEN ? THEN ? ELSE cover_alt END,
        demo=0 WHERE id=? AND updated_at=?`,
            )
            .run(
              data.title,
              data.slug,
              data.description,
              data.content,
              data.categoryId,
              JSON.stringify(data.tags),
              data.status,
              new Date(data.date).toISOString(),
              now,
              JSON.stringify(data.githubRecords),
              data.coverId !== undefined ? 1 : 0,
              data.coverId ?? null,
              data.coverAlt !== undefined ? 1 : 0,
              data.coverAlt ?? "",
              id,
              data.updatedAt || "",
            );
          if (!result.changes)
            throw new HttpError(
              409,
              "文章已被其他页面修改，请刷新后重新编辑。",
            );
        } else {
          database
            .prepare(
              `INSERT INTO articles (id,slug,title,description,content,category_id,tags,status,published_at,created_at,updated_at,github_records,cover_media_id,cover_alt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              id,
              data.slug,
              data.title,
              data.description,
              data.content,
              data.categoryId,
              JSON.stringify(data.tags),
              data.status,
              new Date(data.date).toISOString(),
              now,
              now,
              JSON.stringify(data.githubRecords),
              data.coverId ?? null,
              data.coverAlt ?? "",
            );
        }
        return { id };
      })
      .immediate();
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const { id } = z
      .object({ id: z.string().min(1) })
      .parse(await jsonBody(request));
    if (!database.prepare("DELETE FROM articles WHERE id=?").run(id).changes)
      throw new HttpError(404, "文章不存在。");
    return { ok: true };
  });
}
