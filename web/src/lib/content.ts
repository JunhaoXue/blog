import { database } from "./database";
import type { GitHubRecord } from "./github-records";
import type { PublicComment } from "./annotations";
export type Post = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  categoryId: string;
  tags: string[];
  status: "draft" | "published";
  date: string;
  demo: boolean;
  readingMinutes: number;
  updatedAt: string;
  githubRecords: GitHubRecord[];
  coverId: string | null;
  coverAlt: string;
  headingNumbering: boolean;
};
type PostRow = Omit<
  Post,
  "tags" | "demo" | "readingMinutes" | "githubRecords" | "headingNumbering"
> & {
  tags: string;
  githubRecords: string;
  demo: number;
  headingNumbering: number;
};
const select = `SELECT a.id, a.slug, a.title, a.description, a.content, c.name AS category,
  c.id AS categoryId, a.tags, a.status, a.published_at AS date, a.demo, a.updated_at AS updatedAt, a.github_records AS githubRecords,
  a.cover_media_id AS coverId, a.cover_alt AS coverAlt, a.heading_numbering AS headingNumbering
  FROM articles a JOIN categories c ON c.id = a.category_id`;
function convert(row: PostRow): Post {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    githubRecords: JSON.parse(row.githubRecords),
    demo: Boolean(row.demo),
    headingNumbering: Boolean(row.headingNumbering),
    readingMinutes: Math.max(1, Math.ceil(row.content.length / 500)),
  };
}
export function getPosts(includeDrafts = false): Post[] {
  return (
    database
      .prepare(
        `${select} ${includeDrafts ? "" : "WHERE a.status='published' AND a.published_at<=?"}
    ORDER BY a.published_at DESC`,
      )
      .all(...(includeDrafts ? [] : [new Date().toISOString()])) as PostRow[]
  ).map(convert);
}
export function getPost(slug: string) {
  return getPosts().find((post) => post.slug === slug);
}
export function getCategories() {
  return database
    .prepare(
      `SELECT c.*, COUNT(a.id) AS count FROM categories c LEFT JOIN articles a
    ON a.category_id=c.id AND a.status='published' AND a.published_at<=?
    GROUP BY c.id ORDER BY c.name`,
    )
    .all(new Date().toISOString()) as {
    id: string;
    name: string;
    slug: string;
    count: number;
  }[];
}
export function getComments(articleId: string) {
  const rows = database
    .prepare(
      `SELECT c.id, c.author, c.content, c.anchor, c.parent_id AS parentId, c.created_at AS date, COUNT(v.user_id) AS votes
    FROM comments c LEFT JOIN votes v ON v.comment_id=c.id WHERE c.article_id=? AND c.approved=1
    AND (c.parent_id IS NULL OR EXISTS (SELECT 1 FROM comments p WHERE p.id=c.parent_id AND p.approved=1))
    GROUP BY c.id ORDER BY c.created_at`,
    )
    .all(articleId) as (Omit<PublicComment, "anchor"> & {
    anchor: string | null;
  })[];
  return rows.map((row): PublicComment => ({
    ...row,
    anchor: row.anchor ? JSON.parse(row.anchor) : null,
  }));
}
