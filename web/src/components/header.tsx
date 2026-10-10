import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { getSession } from "@/lib/authorization";
export async function Header() {
  const session = await getSession();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Junhao Xue 首页">
          Junhao Xue
        </Link>
        <nav aria-label="主导航">
          <Link href="/">文章</Link>
          <Link href="/archive">归档</Link>
          <Link href="/discussions">讨论</Link>
          <Link href="/resume">简历</Link>
          <Link href="/about">关于</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href="/search" aria-label="搜索文章">
            <Search size={19} />
          </Link>
          <ThemeToggle />
          <AccountMenu name={session?.user.name} role={session?.user.role} />
        </div>
      </div>
    </header>
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
