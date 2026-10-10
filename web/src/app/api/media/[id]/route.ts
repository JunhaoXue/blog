import fs from "node:fs/promises";
import path from "node:path";
import { database } from "@/lib/database";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = database
    .prepare("SELECT filename,mime FROM media WHERE id=?")
    .get(id) as { filename: string; mime: string } | undefined;
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const buffer = await fs.readFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ process.env.UPLOADS_PATH ||
          path.resolve("uploads"),
        file.filename,
      ),
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
