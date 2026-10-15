import { requireAdmin } from "@/lib/authorization";
import { database } from "@/lib/database";
import { AdminAction } from "@/components/admin-action";
import { MediaUpload } from "@/components/media-upload";
export default async function Media() {
  await requireAdmin();
  const images = database
    .prepare("SELECT * FROM media ORDER BY created_at DESC")
    .all() as { id: string; filename: string; size: number }[];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>图片库</h1>
          <p className="muted">
            支持 PNG、JPEG、GIF 和 WebP，单张不超过 10 MB。
          </p>
        </div>
      </div>
      <MediaUpload />
      <div className="media-grid">
        {images.map((image) => (
          <div className="media-card surface-card" key={image.id}>
            <img src={`/api/media/${image.id}`} alt="已上传的文章图片" />
            <p>{Math.round(image.size / 1024)} KB</p>
            <label className="sr-only" htmlFor={image.id}>
              图片 Markdown
            </label>
            <input
              id={image.id}
              readOnly
              value={`![图片说明](/api/media/${image.id})`}
            />
            <AdminAction
              endpoint="/api/admin/media"
              data={{ id: image.id }}
              method="DELETE"
              label="删除"
              confirmation="确认删除这张图片？已被文章引用的图片不能删除。"
            />
          </div>
        ))}
      </div>
    </>
  );
}
