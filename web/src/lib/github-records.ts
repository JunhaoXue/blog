import { z } from "zod";

export type GitHubRecord = { title: string; url: string };

// Links are stored locally; rendering never requires a GitHub token or API request.
export function describeGitHubRecord(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const match =
      /^\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)(?:\/(commit)\/([a-fA-F0-9]{7,40})|\/(pull)\/([1-9][0-9]*))?\/?$/.exec(
        url.pathname,
      );
    if (
      !match ||
      [match[1], match[2]].some((part) => part === "." || part === "..")
    )
      return null;
    return {
      kind: match[3] ? "提交" : match[5] ? "PR" : "仓库",
      repository: `${match[1]}/${match[2]}`,
      reference: match[4]?.slice(0, 7) || (match[6] ? `#${match[6]}` : ""),
      url: `https://github.com${url.pathname.replace(/\/$/, "")}`,
    };
  } catch {
    return null;
  }
}

export const githubRecordsSchema = z
  .array(
    z.object({
      title: z.string().trim().max(120).default(""),
      url: z
        .string()
        .trim()
        .max(500)
        .refine(
          (url) => Boolean(describeGitHubRecord(url)),
          "请填写 GitHub 仓库、提交或 PR 的 HTTPS 地址（不含查询参数）。",
        )
        .transform((url) => describeGitHubRecord(url)!.url),
    }),
  )
  .max(12, "每篇文章最多关联 12 条 GitHub 记录。")
  .refine(
    (records) =>
      new Set(records.map((record) => record.url.toLowerCase())).size ===
      records.length,
    "GitHub 记录地址不能重复。",
  );
