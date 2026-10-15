import Link from "next/link";
import type { articleAuthor } from "@/lib/article-author";

export function ArticleByline({
  author,
}: {
  author: ReturnType<typeof articleAuthor>;
}) {
  return (
    <div className="article-byline" aria-label="作者信息">
      {author.photoId && (
        <img
          className="article-author-photo"
          src={`/api/media/${author.photoId}`}
          alt=""
          width={40}
          height={40}
        />
      )}
      <div>
        <Link href={author.url} className="article-author-name" rel="author">
          {author.name}
        </Link>
        {(author.current || author.previous) && (
          <p className="article-author-work">
            {author.current && <span>{author.current}</span>}
            {author.previous && <span>曾任职于{author.previous}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
