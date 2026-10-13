import { z } from "zod";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { authorize, endpoint, HttpError, jsonBody } from "@/lib/api";
import { database } from "@/lib/database";
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 11_000_000) throw new HttpError(413, "图片不能超过 10 MB。");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "请选择图片。");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 11_000_000) {
        await reader.cancel();
        throw new HttpError(413, "图片不能超过 10 MB。");
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const form = await new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": request.headers.get("content-type") || "",
      },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 10_000_000 || file.size < 12)
      throw new HttpError(
        400,
        "请选择 10 MB 以内的 PNG、JPEG、GIF 或 WebP 图片。",
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    let mime = "";
    let extension = "";
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      mime = "image/png";
      extension = "png";
    } else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
      mime = "image/jpeg";
      extension = "jpg";
    } else if (
      ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString())
    ) {
      mime = "image/gif";
      extension = "gif";
    } else if (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    ) {
      mime = "image/webp";
      extension = "webp";
    } else throw new HttpError(400, "图片格式无效。不接受 SVG 或可执行文件。");
    const id = randomUUID();
    const filename = `${id}.${extension}`;
    const directory = process.env.UPLOADS_PATH || path.resolve("uploads");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(/* turbopackIgnore: true */ directory, filename),
      buffer,
      { flag: "wx" },
    );
    try {
      database
        .prepare(
          "INSERT INTO media (id,filename,mime,size,created_at) VALUES (?,?,?,?,?)",
        )
        .run(id, filename, mime, file.size, new Date().toISOString());
    } catch (error) {
      await fs.unlink(
        path.join(/* turbopackIgnore: true */ directory, filename),
      );
      throw error;
    }
    return { id, url: `/api/media/${id}` };
  });
}

export async function DELETE(request: Request) {
  return endpoint(async () => {
    await authorize(request, true);
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(request));
    return database
      .transaction(() => {
        const file = database
          .prepare("SELECT filename FROM media WHERE id=?")
          .get(id) as { filename: string } | undefined;
        if (!file) throw new HttpError(404, "图片不存在。");
        if (
          database
            .prepare(
              "SELECT id FROM articles WHERE cover_media_id=? OR content LIKE ? LIMIT 1",
            )
            .get(id, `%/api/media/${id}%`)
        )
          throw new HttpError(
            409,
            "图片仍被文章或封面使用，请先移除引用并保存。",
          );
        if (
          database
            .prepare("SELECT id FROM resume WHERE photo_id=? OR content LIKE ?")
            .get(id, `%/api/media/${id}%`)
        )
          throw new HttpError(
            409,
            "图片仍被简历使用，请先移除简历中的引用并保存。",
          );
        const filename = path.join(
          /* turbopackIgnore: true */ process.env.UPLOADS_PATH ||
            path.resolve("uploads"),
          file.filename,
        );
        try {
          // Keep reference checks and file removal under one write lock so another
          // editor cannot attach a cover between the check and the deletion.
          unlinkSync(/* turbopackIgnore: true */ filename);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        database.prepare("DELETE FROM media WHERE id=?").run(id);
        return { ok: true };
      })
      .immediate();
  });
}
