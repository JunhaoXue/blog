import { requireAdmin } from "@/lib/authorization";
import { getResume } from "@/lib/resume";
import { database } from "@/lib/database";
import { ResumeEditor } from "@/components/resume-editor";

export default async function AdminResumePage() {
  await requireAdmin();
  const media = database
    .prepare("SELECT id, filename FROM media ORDER BY created_at DESC")
    .all() as { id: string; filename: string }[];
  return <ResumeEditor initial={getResume()} media={media} />;
}
