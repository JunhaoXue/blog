"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/site";

type NavigationPost = { slug: string; title: string };
const links = [
  { href: "/", label: "文章" },
  { href: "/resume", label: "关于我" },
];

function PrimaryNavigation({
  articlePage,
  className,
  onNavigate,
}: {
  articlePage: boolean;
  className: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="主导航">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          aria-current={
            (
              link.href === "/"
                ? pathname === "/" || articlePage
                : pathname === link.href || pathname.startsWith(link.href + "/")
            )
              ? "page"
              : undefined
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function NavigationLinks({
  posts,
  onNavigate,
}: {
  posts: NavigationPost[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="sidebar-links" aria-label="文章列表">
      <h2 className="sidebar-section-title">文章</h2>
      <ul className="sidebar-articles">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/posts/${post.slug}`}
              onClick={onNavigate}
              aria-current={
                pathname === `/posts/${post.slug}` ? "page" : undefined
              }
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteNavigation({
  posts,
  actions,
  menuActions,
}: {
  posts: NavigationPost[];
  actions: ReactNode;
  menuActions: ReactNode;
}) {
  const [drawerContent, setDrawerContent] = useState<
    "site" | "articles" | null
  >(null);
  const open = drawerContent !== null;
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const articlePage = posts.some((post) => pathname === `/posts/${post.slug}`);
  useEffect(() => {
    setDrawerContent(null);
  }, [pathname]);
  useEffect(() => {
    const drawer = dialog.current;
    if (!drawer) return;
    if (open && !drawer.open) drawer.showModal();
    if (!open && drawer.open) drawer.close();
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);
  useEffect(() => {
    // 手机菜单切至文章列表时，触发按钮被卸载，焦点会回到页面；
    // 内容切换后将焦点移至关闭按钮，保持键盘操作在模态菜单内。
    if (drawerContent && dialog.current?.open) closeButton.current?.focus();
  }, [drawerContent]);
  useEffect(() => {
    const desktop = window.matchMedia(
      drawerContent === "site" ? "(min-width: 768px)" : "(min-width: 1001px)",
    );
    const resize = () => {
      if (desktop.matches) setDrawerContent(null);
    };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, [drawerContent]);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={`${site.title} 首页`}>
            {site.title}
          </Link>
          <PrimaryNavigation
            articlePage={articlePage}
            className="header-primary-navigation"
          />
          <div className="header-actions">
            {actions}
            {articlePage && (
              <button
                className="icon-button mobile-nav-toggle"
                aria-label="打开文章列表"
                aria-controls="mobile-navigation"
                aria-expanded={drawerContent === "articles"}
                onClick={() => setDrawerContent("articles")}
              >
                <Menu size={16} aria-hidden="true" />
              </button>
            )}
            <button
              className="icon-button header-menu-toggle"
              aria-label="打开导航菜单"
              aria-controls="mobile-navigation"
              aria-expanded={open}
              onClick={() => setDrawerContent("site")}
            >
              <Menu size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {articlePage && (
        <aside className="site-sidebar" aria-label="文章导航">
          <NavigationLinks posts={posts} />
        </aside>
      )}
      <dialog
        ref={dialog}
        id="mobile-navigation"
        className="sidebar-drawer"
        aria-label={drawerContent === "articles" ? "文章列表" : "网站导航"}
        onCancel={() => setDrawerContent(null)}
        onClose={() => setDrawerContent(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDrawerContent(null);
        }}
      >
        <div className="sidebar-drawer-content">
          <div className="sidebar-drawer-heading">
            <button
              ref={closeButton}
              className="icon-button"
              aria-label={
                drawerContent === "articles" ? "关闭文章列表" : "关闭导航菜单"
              }
              onClick={() => setDrawerContent(null)}
              autoFocus
            >
              <X size={20} />
            </button>
          </div>
          {drawerContent === "articles" ? (
            <NavigationLinks
              posts={posts}
              onNavigate={() => setDrawerContent(null)}
            />
          ) : (
            <>
              <PrimaryNavigation
                articlePage={articlePage}
                className="mobile-primary-navigation sidebar-links"
                onNavigate={() => setDrawerContent(null)}
              />
              {articlePage && (
                <button
                  className="mobile-article-link"
                  onClick={() => setDrawerContent("articles")}
                >
                  文章列表
                </button>
              )}
              <div className="mobile-navigation-actions">{menuActions}</div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
