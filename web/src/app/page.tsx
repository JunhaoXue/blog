import Link from "next/link";
import { Search, ArrowUp } from "lucide-react";
import { getPosts, getCategories } from "@/lib/content";
import { PostList } from "@/components/post-list";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; page?: string }>;
}) {
  const query = await searchParams;
  const all = getPosts();
  const filtered = all.filter(
    (p) =>
      (!query.category || p.category === query.category) &&
      (!query.tag || p.tags.includes(query.tag)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(query.page || "1", 10) || 1),
  );
  const posts = filtered.slice((page - 1) * 10, page * 10);
  const categories = getCategories();
  function pageUrl(value: number) {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    params.set("page", String(value));
    return `/?${params}`;
  }
  return (
    <div className="home-shell">
      <h1 className="sr-only">文章</h1>
      <form className="home-search" action="/search" role="search">
        <Search size={18} aria-hidden="true" />
        <label htmlFor="home-query" className="sr-only">
          搜索文章
        </label>
        <input
          id="home-query"
          name="q"
          placeholder="搜索文章"
          maxLength={200}
        />
        <button className="icon-button" aria-label="开始搜索">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </form>
      <nav className="topic-filter" aria-label="文章分类">
        <Link
          href="/"
          aria-current={!query.category && !query.tag ? "page" : undefined}
        >
          全部
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/?category=${encodeURIComponent(category.name)}`}
            aria-current={query.category === category.name ? "page" : undefined}
          >
            {category.name}
          </Link>
        ))}
        {query.tag && (
          <Link
            className="active-filter"
            href="/"
            aria-label={`清除标签 ${query.tag} 的筛选`}
          >
            # {query.tag} ×
          </Link>
        )}
        {query.category && query.tag && (
          <Link href={`/?tag=${encodeURIComponent(query.tag)}`}>清除分类</Link>
        )}
      </nav>
      <PostList posts={posts} />
      {pages > 1 && (
        <nav className="pagination" aria-label="文章分页">
          {page > 1 && <Link href={pageUrl(page - 1)}>上一页</Link>}
          <span>
            {page} / {pages}
          </span>
          {page < pages && <Link href={pageUrl(page + 1)}>下一页</Link>}
        </nav>
      )}
    </div>
  );
}
