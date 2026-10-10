import { z } from "zod";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";

const input = z
  .object({
    name: z.string().trim().min(1, "请输入姓名。").max(100),
    headline: z.string().trim().max(160),
    summary: z.string().trim().max(500),
    content: z.string().max(100_000),
    photoId: z.uuid().nullable(),
    published: z.boolean(),
    revision: z.number().int().nonnegative(),
  })
  .refine(
    (data) => !data.published || data.content.trim().length > 0,
    "公开发布前请填写履历。",
  );

export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const data = input.parse(await jsonBody(request));
    return database
      .transaction(() => {
        if (
          data.photoId &&
          !database.prepare("SELECT id FROM media WHERE id=?").get(data.photoId)
        )
          throw new HttpError(400, "照片不存在，请重新上传或选择。");
        const result = database
          .prepare(
            `UPDATE resume SET name=?,headline=?,summary=?,content=?,
        photo_id=?,published=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?`,
          )
          .run(
            data.name,
            data.headline,
            data.summary,
            data.content,
            data.photoId,
            data.published ? 1 : 0,
            new Date().toISOString(),
            data.revision,
          );
        if (!result.changes)
          throw new HttpError(409, "简历已被其他页面修改，请刷新后重新编辑。");
        return { revision: data.revision + 1 };
      })
      .immediate();
  });
}
