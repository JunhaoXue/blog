"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

type NavigationPost = { slug: string; title: string };
const links = [
  { href: "/", label: "文章" },
  { href: "/archive", label: "归档" },
  { href: "/discussions", label: "讨论" },
  { href: "/resume", label: "简历" },
  { href: "/about", label: "关于" },
];

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
}: {
  posts: NavigationPost[];
  actions: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const articlePage = posts.some((post) => pathname === `/posts/${post.slug}`);
  useEffect(() => {
    setOpen(false);
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
    const desktop = window.matchMedia("(min-width: 1001px)");
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, []);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          {articlePage && (
            <button
              className="icon-button mobile-nav-toggle"
              aria-label="打开文章列表"
              aria-controls="mobile-navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
          )}
          <Link href="/" className="brand" aria-label="Junhao Xue 首页">
            Junhao Xue
          </Link>
          <nav className="header-primary-navigation" aria-label="主导航">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={
                  (
                    link.href === "/"
                      ? pathname === "/" || articlePage
                      : pathname === link.href ||
                        pathname.startsWith(link.href + "/")
                  )
                    ? "page"
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">{actions}</div>
        </div>
      </header>
      {articlePage && (
        <aside className="site-sidebar" aria-label="文章导航">
          <NavigationLinks posts={posts} />
        </aside>
      )}
      {articlePage && (
        <dialog
          ref={dialog}
          id="mobile-navigation"
          className="sidebar-drawer"
          aria-label="文章列表"
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="sidebar-drawer-content">
            <div className="sidebar-drawer-heading">
              <button
                className="icon-button"
                aria-label="关闭文章列表"
                onClick={() => setOpen(false)}
                autoFocus
              >
                <X size={20} />
              </button>
            </div>
            <NavigationLinks posts={posts} onNavigate={() => setOpen(false)} />
          </div>
        </dialog>
      )}
    </>
  );
}
