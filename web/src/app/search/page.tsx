import { getPosts } from "@/lib/content";
import { PostList } from "@/components/post-list";
import { Search as SearchIcon } from "lucide-react";
import { IconLabel } from "@/components/icon-label";
export const metadata = { title: "搜索" };
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim().slice(0, 200) || "";
  const posts = q
    ? getPosts().filter((p) =>
        `${p.title} ${p.description} ${p.content} ${p.tags.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : [];
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>搜索</h1>
      </div>
      <form className="search-form" action="/search">
        <label className="sr-only" htmlFor="q">
          搜索关键词
        </label>
        <input
          id="q"
          name="q"
          placeholder="搜索标题、正文或标签…"
          defaultValue={q}
          maxLength={200}
        />
        <button className="button">
          <IconLabel icon={SearchIcon} leading>
            搜索
          </IconLabel>
        </button>
      </form>
      {q && (
        <>
          <p className="muted">
            “{q}” 找到 {posts.length} 篇文章
          </p>
          <PostList posts={posts} />
        </>
      )}
    </div>
  );
}
