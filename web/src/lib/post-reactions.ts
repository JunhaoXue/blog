import { database } from "./database";

export type ReactionTarget = "article" | "discussion";
export const reactionTables = {
  article: { table: "article_likes", column: "article_id" },
  discussion: { table: "discussion_likes", column: "discussion_id" },
} as const;

export function getPostReactions(
  target: ReactionTarget,
  id: string,
  userId?: string,
) {
  const { table, column } = reactionTables[target];
  const result = database
    .prepare(
      `SELECT COUNT(*) AS count,
    COALESCE(MAX(user_id=?),0) AS liked FROM ${table} WHERE ${column}=?`,
    )
    .get(userId || "", id) as { count: number; liked: number };
  return { count: result.count, liked: Boolean(result.liked) };
}
