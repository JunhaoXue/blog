import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { getSession } from "@/lib/authorization";
import { getPosts } from "@/lib/content";
import { SiteNavigation } from "./site-navigation";
export async function Header() {
  const session = await getSession();
  return (
    <SiteNavigation
      posts={getPosts()
        .slice(0, 12)
        .map(({ slug, title }) => ({ slug, title }))}
      actions={
        <>
          <Link
            className="icon-button header-search"
            href="/search"
            aria-label="搜索文章"
          >
            <Search size={19} />
          </Link>
          <ThemeToggle />
          <AccountMenu name={session?.user.name} role={session?.user.role} />
        </>
      }
    />
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <span>© {new Date().getFullYear()} Junhao Xue</span>
      </div>
      <div>
        <Link href="/links">友链</Link>
        <Link href="/feed.xml">
          RSS <ArrowUpRight size={13} />
        </Link>
        <a
          href="https://github.com/JunhaoXue"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  );
}
