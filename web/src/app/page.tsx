import Link from "next/link";
import { ArrowDown, ArrowUpRight, Rss } from "lucide-react";
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
  const tags = [...new Set(all.flatMap((p) => p.tags))];
  function pageUrl(value: number) {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    params.set("page", String(value));
    return `/?${params}`;
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> NOTES, IDEAS & EVERYDAY THINGS
          </div>
          <h1>
            记录想法，
            <br />
            保持
            <span className="hero-highlight">
              好奇
              <svg viewBox="0 0 220 18" aria-hidden>
                <path d="M3 11 Q85 1 216 9 M25 15 Q120 5 190 13" />
              </svg>
            </span>
            。
          </h1>
          <p>
            关于技术、产品与日常。
            <br />
            把值得留下的想法，写在这里。
          </p>
          <a className="hero-link" href="#articles">
            往下读一点 <ArrowDown size={16} />
          </a>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="orbit">
            <span className="orbit-word">STAY CURIOUS · KEEP BUILDING ·</span>
            <div className="orbit-center">
              jx<span>✳</span>
            </div>
            <span className="orbit-dot" />
          </div>
          <div className="art-caption">
            <span>THE PERSONAL JOURNAL OF</span>
            <strong>JUNHAO XUE</strong>
            <span>
              EST. 2026 <span>↗</span>
            </span>
          </div>
        </div>
      </section>
      <div className="content-grid" id="articles">
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE JOURNAL</span>
              <h2>
                {query.category ||
                  (query.tag ? `# ${query.tag}` : "最近的记录")}{" "}
                <span>{filtered.length}</span>
              </h2>
            </div>
            {(query.category || query.tag) && (
              <Link className="small-link" href="/">
                清除筛选 ×
              </Link>
            )}
          </div>
          <PostList posts={posts} />
          {pages > 1 && (
            <nav className="pagination" aria-label="文章分页">
              {page > 1 && <Link href={pageUrl(page - 1)}>← 上一页</Link>}
              <span>
                {page} / {pages}
              </span>
              {page < pages && <Link href={pageUrl(page + 1)}>下一页 →</Link>}
            </nav>
          )}
        </section>
        <aside className="home-sidebar">
          <section className="aside-section">
            <span className="eyebrow">A LITTLE ABOUT ME</span>
            <div className="profile-monogram">
              JX<span>✳</span>
            </div>
            <h3>你好，我是 Junhao。</h3>
            <p>
              欢迎来到我的个人博客。
              <br />
              在这里，慢慢记录，持续探索。
            </p>
            <Link className="small-link" href="/about">
              更多关于我 <ArrowUpRight size={15} />
            </Link>
          </section>
          <section className="aside-section">
            <span className="eyebrow">EXPLORE BY TOPIC</span>
            <h3>按主题阅读</h3>
            <div className="category-list">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/?category=${encodeURIComponent(c.name)}`}
                >
                  <span>{c.name}</span>
                  <span>
                    {String(c.count).padStart(2, "0")}{" "}
                    <ArrowUpRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section className="aside-section">
            <span className="eyebrow">CONNECTED THOUGHTS</span>
            <h3>一些关键词</h3>
            <div className="tag-cloud">
              {tags.map((tag) => (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          </section>
          <Link href="/feed.xml" className="rss-box">
            <Rss size={19} />
            <div>
              <strong>用 RSS 保持联系</strong>
              <span>新文章，直接送到你的阅读器。</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </aside>
      </div>
    </>
  );
}
