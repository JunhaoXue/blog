import { database } from "./database";
import { site } from "./site";

export type Resume = {
  name: string;
  headline: string;
  summary: string;
  content: string;
  photoId: string | null;
  published: boolean;
  revision: number;
  updatedAt: string;
};

export function getResume(): Resume {
  const row = database
    .prepare(
      `SELECT name, headline, summary, content,
    photo_id AS photoId, published, revision, updated_at AS updatedAt
    FROM resume WHERE id=1`,
    )
    .get() as Omit<Resume, "published"> & { published: number };
  return {
    ...row,
    name: row.name || site.name,
    published: Boolean(row.published),
  };
}
