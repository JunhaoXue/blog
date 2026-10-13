"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ArticleHeading } from "@/lib/article-headings";

export function ArticleToc({
  headings,
  compact = false,
}: {
  headings: ArticleHeading[];
  compact?: boolean;
}) {
  const [active, setActive] = useState(headings[0]?.id || "");
  useEffect(() => {
    if (!headings.length) return;
    const elements = headings.map((heading) =>
      document.getElementById(heading.id),
    );
    let frame = 0;
    function update() {
      frame = 0;
      const headerBottom =
        document.querySelector(".site-header")?.getBoundingClientRect()
          .bottom || 64;
      let current = headings[0].id;
      for (let i = 0; i < elements.length; i++) {
        if (
          elements[i] &&
          elements[i]!.getBoundingClientRect().top <= headerBottom + 48
        )
          current = headings[i].id;
      }
      setActive(current);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [headings]);
  if (!headings.length) return null;
  const minimum = Math.min(...headings.map((heading) => heading.depth));
  const links = (
    <nav aria-label="文章标题目录">
      <ol>
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={
              {
                "--toc-indent": Math.min(heading.depth - minimum, 3),
              } as CSSProperties
            }
          >
            <a
              href={`#${heading.id}`}
              aria-current={active === heading.id ? "location" : undefined}
              onClick={(event) => {
                setActive(heading.id);
                if (compact)
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
              }}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
  return compact ? (
    <details className="article-toc-mobile">
      <summary>文章目录</summary>
      {links}
    </details>
  ) : (
    <aside className="article-toc" aria-label="文章目录">
      {links}
    </aside>
  );
}
