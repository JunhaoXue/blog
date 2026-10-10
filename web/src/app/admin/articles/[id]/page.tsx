import { requireAdmin } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/article-editor";
import { getCategories, getPosts } from "@/lib/content";
export default async function EditArticle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = (await params).id;
  const article = getPosts(true).find((post) => post.id === id);
  if (!article) notFound();
  return (
    <ArticleEditor
      key={article.updatedAt}
      post={article}
      categories={getCategories()}
    />
  );
}
