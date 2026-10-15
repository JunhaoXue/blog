import { requireAdmin } from "@/lib/authorization";
import { ArticleEditor } from "@/components/article-editor";
import { getCategories } from "@/lib/content";
export default async function NewArticle() {
  await requireAdmin();
  return <ArticleEditor categories={getCategories()} />;
}
