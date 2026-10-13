import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import Database from "better-sqlite3";
import {
  articleText,
  makeAnchor,
  resolveAnchor,
  annotationPlugin,
} from "../src/lib/annotations";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resumeLayoutPlugin } from "../src/lib/resume-layout";
const directory = mkdtempSync(path.join(tmpdir(), "junhao-blog-test-"));
const port = process.env.TEST_PORT || "3001";
const base = `http://localhost:${port}`;
const password = randomBytes(18).toString("hex");
// The cover regression initially hit another project's occupied 3001 port;
// its homepage looked ready but /archive returned 404. Refuse occupied ports
// before spawning so a different service can never be mistaken for this test.
if (await fetch(base).catch(() => null)) {
  rmSync(directory, { recursive: true, force: true });
  throw new Error(`Test port ${port} is occupied; choose a free TEST_PORT.`);
}
const env = {
  ...process.env,
  BETTER_AUTH_URL: base,
  DATABASE_PATH: path.join(directory, "blog.sqlite"),
  UPLOADS_PATH: path.join(directory, "uploads"),
  BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
  ADMIN_EMAIL: "admin@example.test",
  ADMIN_PASSWORD: password,
  NEXT_TELEMETRY_DISABLED: "1",
  BLOG_TEST_FIXTURES: "1",
};
const setup = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/setup.ts"],
  { env, encoding: "utf8" },
);
if (setup.status !== 0) throw new Error(setup.stderr);
const db = new Database(env.DATABASE_PATH);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});
let checks = 0;
let adminCookie = "",
  readerCookie = "";
const ok = (description: string, actual: unknown, expected: unknown) => {
  assert.deepEqual(actual, expected, description);
  checks++;
  console.log(`PASS ${description}`);
};
async function write(
  url: string,
  body: unknown,
  cookie = "",
  method = "POST",
  origin = base,
) {
  return fetch(base + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}
async function login(email: string, pass: string) {
  const response = await write("/api/auth/sign-in/email", {
    email,
    password: pass,
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}
try {
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(base)).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, logs);
  const renderResumeMarkdown = (content: string, styled = true) =>
    renderToStaticMarkup(
      createElement(ReactMarkdown, {
        remarkPlugins: [remarkGfm],
        rehypePlugins: styled ? [resumeLayoutPlugin] : [],
        children: content,
      }),
    );
  const portfolioFixture = `## 工作经历

**产品团队 · 产品经理**\\
2022.07 – 至今

负责产品体验与开发协作。

## 作品

**项目名称**\\
2026.09

这是项目介绍，保留 **重点**。

![项目截图](/api/media/test-image)

[访问作品](https://example.test/project)

## 其他信息

保留自定义段落。`;
  const portfolioHtml = renderResumeMarkdown(portfolioFixture);
  ok(
    "resume layouts group experience and projects",
    portfolioHtml.includes('class="resume-work-row"') &&
      portfolioHtml.includes('class="resume-project-card surface-card"'),
    true,
  );
  ok(
    "resume layouts preserve descriptions, dates and custom sections",
    [
      "产品团队 · 产品经理",
      "2022.07 – 至今",
      "负责产品体验与开发协作。",
      "2026.09",
      "<strong>重点</strong>",
      "保留自定义段落。",
    ].every((value) => portfolioHtml.includes(value)),
    true,
  );
  ok(
    "resume cards preserve screenshots and real links",
    portfolioHtml.includes('src="/api/media/test-image"') &&
      portfolioHtml.includes('href="https://example.test/project"'),
    true,
  );
  for (const source of [
    "## 工作经历\n\n自由格式正文。",
    "## 作品\n\n**尚未写完的项目**",
    "## 作品\n\n**重点** 与普通正文混排。",
    "## 教育背景\n\n**学校**\n\n原格式。",
  ]) {
    ok(
      "resume custom or incomplete Markdown retains original rendering",
      renderResumeMarkdown(source),
      renderResumeMarkdown(source, false),
    );
  }
  const unsafeResume = renderResumeMarkdown(
    "## 作品\n\n**项目**\n\n[危险链接](javascript:alert(1))\n\n<script>alert(1)</script>",
  );
  ok(
    "resume card layout retains Markdown safety",
    unsafeResume.includes('href="javascript:') ||
      unsafeResume.includes("<script>"),
    false,
  );
  const blankEnv = {
    ...env,
    DATABASE_PATH: path.join(directory, "blank.sqlite"),
    BLOG_TEST_FIXTURES: "0",
  };
  const blankSetup = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/setup.ts"],
    { env: blankEnv, encoding: "utf8" },
  );
  ok("production setup without generated notes", blankSetup.status, 0);
  const blankDb = new Database(blankEnv.DATABASE_PATH);
  try {
    ok(
      "production setup leaves articles empty",
      (
        blankDb.prepare("SELECT COUNT(*) AS count FROM articles").get() as {
          count: number;
        }
      ).count,
      0,
    );
    const noReseed = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/setup.ts"],
      { env: { ...blankEnv, BLOG_TEST_FIXTURES: "1" }, encoding: "utf8" },
    );
    ok("repeat setup succeeds on empty production blog", noReseed.status, 0);
    ok(
      "repeat setup cannot restore generated notes",
      (
        blankDb.prepare("SELECT COUNT(*) AS count FROM articles").get() as {
          count: number;
        }
      ).count,
      0,
    );
  } finally {
    blankDb.close();
  }
  for (const url of [
    "/",
    "/archive",
    "/about",
    "/resume",
    "/search?q=Markdown",
    "/links",
    "/discussions",
    "/login",
    "/feed.xml",
    "/sitemap.xml",
    "/robots.txt",
    "/api/health",
  ])
    ok(`${url} serves`, (await fetch(base + url)).status, 200);
  ok(
    "unknown article returns 404",
    (await fetch(base + "/posts/missing")).status,
    404,
  );
  ok(
    "anonymous admin redirects",
    (await fetch(base + "/admin", { redirect: "manual" })).status,
    307,
  );
  ok(
    "anonymous write blocked",
    (await write("/api/admin/articles", {})).status,
    401,
  );
  ok(
    "cross-origin write blocked",
    (
      await write(
        "/api/admin/articles",
        {},
        "",
        "POST",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  adminCookie = await login("admin@example.test", password);
  ok(
    "admin dashboard accessible",
    (await fetch(base + "/admin", { headers: { cookie: adminCookie } })).status,
    200,
  );
  const example = db
    .prepare("SELECT * FROM articles WHERE demo=1 LIMIT 1")
    .get() as {
    id: string;
    slug: string;
    description: string;
    content: string;
    category_id: string;
    tags: string;
    published_at: string;
    updated_at: string;
  };
  // Reproduce the pre-feature database, then migrate without losing existing articles.
  db.prepare(
    "INSERT INTO comments(id,article_id,user_id,author,content,approved,created_at) VALUES (?,?,?,?,?,?,?)",
  ).run(
    "legacy-comment",
    example.id,
    "legacy-user",
    "Legacy",
    "Existing comment",
    0,
    new Date(0).toISOString(),
  );
  db.prepare("INSERT INTO votes(user_id,comment_id) VALUES (?,?)").run(
    "legacy-user",
    "legacy-comment",
  );
  db.exec(
    "DELETE FROM schema_migrations WHERE version IN (3,6,7); ALTER TABLE articles DROP COLUMN github_records; DROP INDEX comments_parent; ALTER TABLE comments DROP COLUMN parent_id; ALTER TABLE comments DROP COLUMN anchor; DROP INDEX articles_cover; ALTER TABLE articles DROP COLUMN cover_media_id; ALTER TABLE articles DROP COLUMN cover_alt;",
  );
  const migrated = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/setup.ts"],
    { env, encoding: "utf8" },
  );
  ok("existing database upgrades", migrated.status, 0);
  ok(
    "cover migration preserves legacy articles without assigning images",
    db.prepare("SELECT cover_media_id,cover_alt FROM articles LIMIT 1").get(),
    { cover_media_id: null, cover_alt: "" },
  );
  ok(
    "annotation migration preserves ordinary comments",
    db
      .prepare(
        "SELECT content,anchor,parent_id FROM comments WHERE id='legacy-comment'",
      )
      .get(),
    { content: "Existing comment", anchor: null, parent_id: null },
  );
  ok(
    "annotation migration preserves comment votes",
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM votes WHERE comment_id='legacy-comment'",
      )
      .get(),
    { count: 1 },
  );
  db.prepare("DELETE FROM comments WHERE id='legacy-comment'").run();
  ok(
    "migration preserves existing article",
    (
      db.prepare("SELECT content FROM articles WHERE id=?").get(example.id) as {
        content: string;
      }
    ).content,
    example.content,
  );
  ok(
    "existing article has GitHub empty state",
    (await (await fetch(base + `/posts/${example.slug}`)).text()).includes(
      "这篇文章暂未关联仓库、提交或 PR。",
    ),
    true,
  );
  ok(
    "replace example with real article",
    (
      await write(
        "/api/admin/articles",
        {
          id: example.id,
          title: "Real authored article",
          slug: example.slug,
          description: example.description,
          content: example.content,
          categoryId: example.category_id,
          tags: JSON.parse(example.tags),
          status: "published",
          date: example.published_at,
          updatedAt: example.updated_at,
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "edited example becomes normal article",
    (
      db.prepare("SELECT demo FROM articles WHERE id=?").get(example.id) as {
        demo: number;
      }
    ).demo,
    0,
  );
  ok(
    "edited example included in RSS",
    (await (await fetch(base + "/feed.xml")).text()).includes(
      `/posts/${example.slug}`,
    ),
    true,
  );
  const registration = await write("/api/auth/sign-up/email", {
    email: "reader@example.test",
    password,
    name: "QA Reader",
    role: "admin",
  });
  ok("reader registration", registration.status, 200);
  const reader = await registration.json();
  readerCookie = registration.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  ok(
    "role injection ignored",
    (
      db.prepare("SELECT role FROM user WHERE id=?").get(reader.user.id) as {
        role: string;
      }
    ).role,
    "reader",
  );
  ok(
    "reader cannot write admin API",
    (await write("/api/admin/articles", {}, readerCookie)).status,
    403,
  );
  const category = (
    db.prepare("SELECT id FROM categories LIMIT 1").get() as { id: string }
  ).id;
  const data = {
    title: "Integration test article",
    slug: "integration-test",
    description: "QA only",
    content: '## Safe Markdown\n\n<script>alert("xss")</script>',
    categoryId: category,
    tags: ["QA"],
    status: "draft",
    date: new Date(Date.now() - 1000).toISOString(),
    githubRecords: [
      { title: "博客仓库", url: "https://github.com/JunhaoXue/blog/" },
      {
        title: "重构提交",
        url: "https://github.com/JunhaoXue/blog/commit/29a469fd5e182964bd9b5e19defa688fae795947",
      },
      { title: "重构 PR", url: "https://github.com/JunhaoXue/blog/pull/1" },
    ],
  };
  for (const url of [
    "javascript:alert(1)",
    "https://github.com.evil.test/a/b",
    "https://github.com@evil.test/a/b",
    "https://github.com/a/b/issues/1",
    "https://github.com/a/b?token=secret",
  ]) {
    ok(
      `invalid GitHub address rejected: ${url}`,
      (
        await write(
          "/api/admin/articles",
          { ...data, githubRecords: [{ title: "", url }] },
          adminCookie,
        )
      ).status,
      400,
    );
  }
  ok(
    "duplicate GitHub records rejected",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          githubRecords: [
            data.githubRecords[0],
            {
              ...data.githubRecords[0],
              url: "https://github.com/JunhaoXue/blog",
            },
          ],
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "too many GitHub records rejected",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          githubRecords: Array.from({ length: 13 }, (_, i) => ({
            title: "",
            url: `https://github.com/JunhaoXue/blog/pull/${i + 1}`,
          })),
        },
        adminCookie,
      )
    ).status,
    400,
  );
  const created = await write("/api/admin/articles", data, adminCookie);
  ok("create draft", created.status, 200);
  const { id } = await created.json();
  ok(
    "GitHub records persisted and canonicalized",
    JSON.parse(
      (
        db
          .prepare("SELECT github_records FROM articles WHERE id=?")
          .get(id) as { github_records: string }
      ).github_records,
    )[0].url,
    "https://github.com/JunhaoXue/blog",
  );
  ok(
    "editor restores GitHub record fields",
    (
      await (
        await fetch(base + `/admin/articles/${id}`, {
          headers: { cookie: adminCookie },
        })
      ).text()
    ).includes('value="重构 PR"'),
    true,
  );
  ok(
    "draft is private",
    (await fetch(base + "/posts/integration-test")).status,
    404,
  );
  const articleLike = { target: "article", id, liked: true };
  ok(
    "anonymous post like blocked",
    (await write("/api/likes", articleLike, "", "PUT")).status,
    401,
  );
  ok(
    "cross-origin post like blocked",
    (
      await write(
        "/api/likes",
        articleLike,
        readerCookie,
        "PUT",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  ok(
    "draft article like blocked",
    (await write("/api/likes", articleLike, readerCookie, "PUT")).status,
    404,
  );
  ok(
    "missing post like blocked",
    (
      await write(
        "/api/likes",
        { ...articleLike, id: "missing" },
        readerCookie,
        "PUT",
      )
    ).status,
    404,
  );
  ok(
    "invalid like target blocked",
    (
      await write(
        "/api/likes",
        { ...articleLike, target: "user" },
        readerCookie,
        "PUT",
      )
    ).status,
    400,
  );
  ok(
    "invalid like state blocked",
    (
      await write(
        "/api/likes",
        { ...articleLike, liked: "yes" },
        readerCookie,
        "PUT",
      )
    ).status,
    400,
  );
  ok(
    "draft absent from search",
    (
      await (
        await fetch(base + "/search?q=Integration%20test%20article")
      ).text()
    )
      .replace(/<!--.*?-->/g, "")
      .includes("找到 0 篇文章"),
    true,
  );
  let updatedAt = (
    db.prepare("SELECT updated_at FROM articles WHERE id=?").get(id) as {
      updated_at: string;
    }
  ).updated_at;
  ok(
    "publish article",
    (
      await write(
        "/api/admin/articles",
        { ...data, id, status: "published", updatedAt },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "published article readable",
    (await fetch(base + "/posts/integration-test")).status,
    200,
  );
  const likedArticle = await write(
    "/api/likes",
    articleLike,
    readerCookie,
    "PUT",
  );
  ok("reader can like article", likedArticle.status, 200);
  ok("article like response authoritative", await likedArticle.json(), {
    count: 1,
    liked: true,
  });
  const duplicateLikes = await Promise.all([
    write("/api/likes", articleLike, readerCookie, "PUT"),
    write("/api/likes", articleLike, readerCookie, "PUT"),
  ]);
  ok(
    "concurrent duplicate likes do not inflate count",
    await Promise.all(duplicateLikes.map((response) => response.json())),
    [
      { count: 1, liked: true },
      { count: 1, liked: true },
    ],
  );
  const likedPage = await (
    await fetch(base + "/posts/integration-test", {
      headers: { cookie: readerCookie },
    })
  ).text();
  ok(
    "reload restores liked state",
    likedPage.includes('aria-pressed="true"') &&
      likedPage.includes("取消点赞，1人点赞"),
    true,
  );
  ok(
    "guest sees count without inheriting liked state",
    (await (await fetch(base + "/posts/integration-test")).text()).includes(
      "点赞，1人点赞",
    ),
    true,
  );
  const adminLike = await write("/api/likes", articleLike, adminCookie, "PUT");
  ok("different accounts counted separately", await adminLike.json(), {
    count: 2,
    liked: true,
  });
  const unlike = await write(
    "/api/likes",
    { ...articleLike, liked: false },
    readerCookie,
    "PUT",
  );
  ok("reader can cancel own like", await unlike.json(), {
    count: 1,
    liked: false,
  });
  ok(
    "repeated unlike does not reduce others count",
    await (
      await write(
        "/api/likes",
        { ...articleLike, liked: false },
        readerCookie,
        "PUT",
      )
    ).json(),
    { count: 1, liked: false },
  );
  const postButtons = await (
    await fetch(base + "/posts/integration-test")
  ).text();
  ok(
    "article sharing control visible",
    postButtons.includes("post-actions-buttons") &&
      postButtons.includes("分享"),
    true,
  );
  const githubPage = await (
    await fetch(base + "/posts/integration-test")
  ).text();
  ok(
    "all article GitHub records publicly linked",
    data.githubRecords.every((record) =>
      githubPage.includes(`href="${record.url.replace(/\/$/, "")}"`),
    ),
    true,
  );
  ok(
    "GitHub types and commit reference displayed",
    ["GitHub 记录", "提交", "PR", "29a469f"].every((label) =>
      githubPage.includes(label),
    ),
    true,
  );
  ok(
    "Markdown cannot inject script",
    (await (await fetch(base + "/posts/integration-test")).text()).includes(
      '<script>alert("xss")</script>',
    ),
    false,
  );
  ok(
    "stale save rejected",
    (
      await write(
        "/api/admin/articles",
        { ...data, id, updatedAt },
        adminCookie,
      )
    ).status,
    409,
  );
  const githubVersion = (
    db.prepare("SELECT updated_at FROM articles WHERE id=?").get(id) as {
      updated_at: string;
    }
  ).updated_at;
  ok(
    "remove article GitHub records",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          status: "published",
          updatedAt: githubVersion,
          githubRecords: [],
        },
        adminCookie,
      )
    ).status,
    200,
  );
  const clearedPage = await (
    await fetch(base + "/posts/integration-test")
  ).text();
  ok(
    "removed PR no longer displayed",
    clearedPage.includes('href="https://github.com/JunhaoXue/blog/pull/1"'),
    false,
  );
  ok(
    "empty GitHub section remains on article",
    clearedPage.includes("这篇文章暂未关联仓库、提交或 PR。"),
    true,
  );
  ok(
    "sitemap updates after publication",
    (await (await fetch(base + "/sitemap.xml")).text()).includes(
      "/posts/integration-test",
    ),
    true,
  );
  ok(
    "RSS includes published article",
    (await (await fetch(base + "/feed.xml")).text()).includes(
      "/posts/integration-test",
    ),
    true,
  );
  ok(
    "reader comment submitted",
    (
      await write(
        "/api/comments",
        { articleId: id, content: "QA moderation comment" },
        readerCookie,
      )
    ).status,
    200,
  );
  const comment = db
    .prepare("SELECT id,approved FROM comments WHERE article_id=?")
    .get(id) as { id: string; approved: number };
  ok("reader comment awaits moderation", comment.approved, 0);
  ok(
    "unapproved comment hidden",
    (await (await fetch(base + "/posts/integration-test")).text()).includes(
      "QA moderation comment",
    ),
    false,
  );
  ok(
    "comment spam throttled",
    (
      await write(
        "/api/comments",
        { articleId: id, content: "Repeated" },
        readerCookie,
      )
    ).status,
    429,
  );
  ok(
    "approve comment",
    (
      await write(
        "/api/admin/manage",
        { type: "comment", id: comment.id, approved: true },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "approved comment visible",
    (await (await fetch(base + "/posts/integration-test")).text()).includes(
      "QA moderation comment",
    ),
    true,
  );
  ok(
    "comment vote accepted",
    (await write("/api/comments", { id: comment.id }, readerCookie, "PATCH"))
      .status,
    200,
  );
  ok(
    "vote persisted",
    (
      db.prepare("SELECT COUNT(*) AS count FROM votes").get() as {
        count: number;
      }
    ).count,
    1,
  );
  ok(
    "vote toggled off",
    (await write("/api/comments", { id: comment.id }, readerCookie, "PATCH"))
      .status,
    200,
  );
  ok(
    "toggled vote removed",
    (
      db.prepare("SELECT COUNT(*) AS count FROM votes").get() as {
        count: number;
      }
    ).count,
    0,
  );
  const annotationMarkdown =
    "## 阅读测试\n\n甲段 **共同词语** 后面是甲。\n\n乙段 共同词语 后面是乙。\n\n| 左列 | 右列 |\n| --- | --- |\n| 表格选字 | 测试 |\n\n[源文链接](https://example.test)";
  const annotationArticle = await write(
    "/api/admin/articles",
    {
      ...data,
      slug: "annotation-test",
      title: "Annotation fixture",
      content: annotationMarkdown,
      status: "published",
    },
    adminCookie,
  );
  ok("create annotation test article", annotationArticle.status, 200);
  const annotationArticleId = (await annotationArticle.json()).id as string;
  const renderedText = articleText(annotationMarkdown);
  const stripMarkup = (html: string) =>
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
  const richSource =
    annotationMarkdown +
    '\n\n- [x] 任务\n\n`code & text`\n\n<script>alert("xss")</script>';
  const richHtml = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      children: richSource,
    }),
  );
  ok(
    "selection offsets match actual renderer across tables, tasks and escaped HTML",
    articleText(richSource),
    stripMarkup(richHtml),
  );
  const overlappingHtml = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        annotationPlugin([
          {
            id: "cross-node",
            start: renderedText.indexOf("甲段"),
            end: renderedText.indexOf("乙段") + 8,
          },
          {
            id: "overlap",
            start: renderedText.indexOf("共同词语"),
            end: renderedText.indexOf("共同词语") + 4,
          },
          {
            id: "table-cell",
            start: renderedText.indexOf("表格选字"),
            end: renderedText.indexOf("表格选字") + 4,
          },
        ]),
      ],
      children: annotationMarkdown,
    }),
  );
  ok(
    "overlapping cross-block annotations preserve all rendered text",
    stripMarkup(overlappingHtml),
    renderedText,
  );
  ok(
    "overlapping annotations retain both discussion references",
    overlappingHtml.includes('data-comment-ids="cross-node,overlap"'),
    true,
  );
  ok(
    "table cell annotation renders safely",
    overlappingHtml.includes('data-comment-ids="table-cell">表格选字</mark>'),
    true,
  );
  const revision = createHash("sha256")
    .update(annotationMarkdown)
    .digest("hex");
  const quoteStart = renderedText.lastIndexOf("共同词语");
  const anchor = makeAnchor(renderedText, quoteStart, quoteStart + 4, revision);
  const annotationBody = {
    articleId: annotationArticleId,
    content: "Quoted thought",
    anchor,
  };
  const ageComments = () =>
    db
      .prepare("UPDATE comments SET created_at=? WHERE user_id IN (?,?)")
      .run(
        new Date(0).toISOString(),
        reader.user.id,
        (
          db
            .prepare("SELECT id FROM user WHERE email='admin@example.test'")
            .get() as { id: string }
        ).id,
      );
  ageComments();
  ok(
    "anonymous annotation blocked",
    (await write("/api/comments", annotationBody)).status,
    401,
  );
  ok(
    "cross-origin annotation blocked",
    (
      await write(
        "/api/comments",
        annotationBody,
        readerCookie,
        "POST",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  ok(
    "fabricated quote rejected",
    (
      await write(
        "/api/comments",
        { ...annotationBody, anchor: { ...anchor, exact: "不存在的原文" } },
        readerCookie,
      )
    ).status,
    400,
  );
  ok(
    "incorrect quote context rejected",
    (
      await write(
        "/api/comments",
        { ...annotationBody, anchor: { ...anchor, prefix: "forged" } },
        readerCookie,
      )
    ).status,
    400,
  );
  ok(
    "incorrect quote position rejected",
    (
      await write(
        "/api/comments",
        { ...annotationBody, anchor: { ...anchor, start: quoteStart + 1 } },
        readerCookie,
      )
    ).status,
    400,
  );
  ok(
    "outdated article revision rejected",
    (
      await write(
        "/api/comments",
        { ...annotationBody, anchor: { ...anchor, revision: "0".repeat(64) } },
        readerCookie,
      )
    ).status,
    409,
  );
  ok(
    "oversized quote rejected",
    (
      await write(
        "/api/comments",
        { ...annotationBody, anchor: { ...anchor, exact: "字".repeat(2001) } },
        readerCookie,
      )
    ).status,
    400,
  );
  const quoted = await write("/api/comments", annotationBody, readerCookie);
  ok("reader annotation accepted", quoted.status, 200);
  const quotedResult = await quoted.json();
  ok("reader annotation awaits approval", quotedResult.approved, false);
  ok(
    "quote and occurrence persisted",
    JSON.parse(
      (
        db
          .prepare("SELECT anchor FROM comments WHERE id=?")
          .get(quotedResult.id) as { anchor: string }
      ).anchor,
    ),
    anchor,
  );
  let annotationPage = await (
    await fetch(base + "/posts/annotation-test")
  ).text();
  ok(
    "pending annotations have no public underline",
    annotationPage.includes('class="annotation-mark"'),
    false,
  );
  ok(
    "pending annotation content private",
    annotationPage.includes("Quoted thought"),
    false,
  );
  ok(
    "pending annotation cannot be replied to",
    (
      await write(
        "/api/comments",
        {
          articleId: annotationArticleId,
          parentId: quotedResult.id,
          content: "Hidden reply",
        },
        adminCookie,
      )
    ).status,
    404,
  );
  await write(
    "/api/admin/manage",
    { type: "comment", id: quotedResult.id, approved: true },
    adminCookie,
  );
  annotationPage = await (await fetch(base + "/posts/annotation-test")).text();
  ok(
    "approved quote underlines correct repeated occurrence",
    annotationPage.includes(`甲段 <strong>共同词语</strong> 后面是甲。`) &&
      annotationPage.includes(`乙段 <mark`) &&
      annotationPage.includes(`data-comment-ids="${quotedResult.id}"`),
    true,
  );
  ok(
    "approved quoted comment public",
    annotationPage.includes("Quoted thought"),
    true,
  );
  ok(
    "admin moderation displays quoted context",
    (
      await (
        await fetch(base + "/admin/comments", {
          headers: { cookie: adminCookie },
        })
      ).text()
    ).includes('class="comment-quote"'),
    true,
  );
  ok(
    "annotation and reply cannot be mixed",
    (
      await write(
        "/api/comments",
        { ...annotationBody, parentId: quotedResult.id },
        readerCookie,
      )
    ).status,
    400,
  );
  ok(
    "reply cannot target another article",
    (
      await write(
        "/api/comments",
        { articleId: id, parentId: quotedResult.id, content: "Wrong article" },
        adminCookie,
      )
    ).status,
    404,
  );
  ok(
    "annotation spam throttled",
    (await write("/api/comments", annotationBody, readerCookie)).status,
    429,
  );
  ageComments();
  const quotedReply = await write(
    "/api/comments",
    {
      articleId: annotationArticleId,
      parentId: quotedResult.id,
      content: "Quoted reply",
    },
    readerCookie,
  );
  ok("reader thread reply accepted", quotedReply.status, 200);
  const quotedReplyId = (await quotedReply.json()).id as string;
  ok(
    "pending thread reply private",
    (await (await fetch(base + "/posts/annotation-test")).text()).includes(
      "Quoted reply",
    ),
    false,
  );
  await write(
    "/api/admin/manage",
    { type: "comment", id: quotedReplyId, approved: true },
    adminCookie,
  );
  ok(
    "approved reply included in discussion",
    (await (await fetch(base + "/posts/annotation-test")).text()).includes(
      "Quoted reply",
    ),
    true,
  );
  ok(
    "nested reply chain rejected",
    (
      await write(
        "/api/comments",
        {
          articleId: annotationArticleId,
          parentId: quotedReplyId,
          content: "Nested",
        },
        adminCookie,
      )
    ).status,
    404,
  );
  await write(
    "/api/admin/manage",
    { type: "comment", id: quotedResult.id, approved: false },
    adminCookie,
  );
  annotationPage = await (await fetch(base + "/posts/annotation-test")).text();
  ok(
    "hiding parent hides underlines and entire thread",
    [
      annotationPage.includes('class="annotation-mark"'),
      annotationPage.includes("Quoted thought"),
      annotationPage.includes("Quoted reply"),
    ],
    [false, false, false],
  );
  ok(
    "hidden parent blocks replies",
    (
      await write(
        "/api/comments",
        {
          articleId: annotationArticleId,
          parentId: quotedResult.id,
          content: "Hidden",
        },
        adminCookie,
      )
    ).status,
    404,
  );
  ok(
    "hidden thread cannot receive votes",
    (await write("/api/comments", { id: quotedReplyId }, readerCookie, "PATCH"))
      .status,
    404,
  );
  await write(
    "/api/admin/manage",
    { type: "comment", id: quotedResult.id, approved: true },
    adminCookie,
  );
  const shifted = "新增开头\n\n" + annotationMarkdown;
  db.prepare("UPDATE articles SET content=? WHERE id=?").run(
    shifted,
    annotationArticleId,
  );
  ok(
    "submitted anchor becomes stale after edit",
    (await write("/api/comments", annotationBody, readerCookie)).status,
    409,
  );
  annotationPage = await (await fetch(base + "/posts/annotation-test")).text();
  ok(
    "unique context reattaches after preceding edit",
    annotationPage.includes(`data-comment-ids="${quotedResult.id}"`),
    true,
  );
  ok(
    "repeated quote resolves by context",
    resolveAnchor(articleText(shifted), anchor)?.start,
    articleText(shifted).lastIndexOf("共同词语"),
  );
  const identical = `${"前".repeat(64)}重复${"后".repeat(64)}\n`.repeat(2);
  const ambiguous = makeAnchor(identical, 64, 66, revision);
  ok(
    "unchanged revision preserves exact occurrence",
    resolveAnchor(identical, ambiguous, revision)?.start,
    64,
  );
  ok(
    "ambiguous edited occurrence never moves silently",
    resolveAnchor(identical, ambiguous, "changed"),
    null,
  );
  db.prepare("UPDATE articles SET content=? WHERE id=?").run(
    "原文已替换",
    annotationArticleId,
  );
  annotationPage = await (await fetch(base + "/posts/annotation-test")).text();
  ok(
    "removed quote retains discussion without underline",
    [
      annotationPage.includes('class="annotation-mark"'),
      annotationPage.includes("Quoted thought"),
    ],
    [false, true],
  );
  db.prepare("UPDATE articles SET status='draft' WHERE id=?").run(
    annotationArticleId,
  );
  ok(
    "private article blocks annotation",
    (await write("/api/comments", annotationBody, readerCookie)).status,
    404,
  );
  ok(
    "private article blocks thread votes",
    (
      await write(
        "/api/comments",
        { id: quotedResult.id },
        readerCookie,
        "PATCH",
      )
    ).status,
    404,
  );
  db.prepare(
    "UPDATE articles SET status='published',published_at=? WHERE id=?",
  ).run(new Date(Date.now() + 86400000).toISOString(), annotationArticleId);
  ok(
    "future article blocks annotation",
    (await write("/api/comments", annotationBody, readerCookie)).status,
    404,
  );
  await write(
    "/api/admin/manage",
    { type: "comment", id: quotedResult.id },
    adminCookie,
    "DELETE",
  );
  ok(
    "deleting root cascades thread replies",
    db
      .prepare("SELECT COUNT(*) AS count FROM comments WHERE article_id=?")
      .get(annotationArticleId),
    { count: 0 },
  );
  await write(
    "/api/admin/articles",
    { id: annotationArticleId },
    adminCookie,
    "DELETE",
  );
  ok(
    "cannot delete category containing articles",
    (
      await write(
        "/api/admin/manage",
        { type: "category", id: category },
        adminCookie,
        "DELETE",
      )
    ).status,
    409,
  );
  const admin = db.prepare("SELECT id FROM user WHERE role='admin'").get() as {
    id: string;
  };
  ok(
    "last admin preserved",
    (
      await write(
        "/api/admin/manage",
        { type: "user", id: admin.id, role: "reader" },
        adminCookie,
      )
    ).status,
    409,
  );
  ok(
    "unsafe link rejected",
    (
      await write(
        "/api/admin/manage",
        {
          type: "link",
          name: "Unsafe",
          url: "javascript:alert(1)",
          description: "",
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "friend link created",
    (
      await write(
        "/api/admin/manage",
        {
          type: "link",
          name: "QA Link",
          url: "https://example.com",
          description: "QA",
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "friend link visible",
    (await (await fetch(base + "/links")).text()).includes("QA Link"),
    true,
  );
  const svg = new FormData();
  svg.append(
    "file",
    new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'], {
      type: "image/svg+xml",
    }),
    "image.svg",
  );
  ok(
    "SVG upload blocked",
    (
      await fetch(base + "/api/admin/media", {
        method: "POST",
        headers: { origin: base, cookie: adminCookie },
        body: svg,
      })
    ).status,
    400,
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
    "base64",
  );
  const image = new FormData();
  image.append(
    "file",
    new Blob([png], { type: "image/jpeg" }),
    "misleading.jpg",
  );
  const uploaded = await fetch(base + "/api/admin/media", {
    method: "POST",
    headers: { origin: base, cookie: adminCookie },
    body: image,
  });
  ok("image upload accepted", uploaded.status, 200);
  const media = await uploaded.json();
  const download = await fetch(base + media.url);
  ok(
    "actual image type used",
    download.headers.get("content-type"),
    "image/png",
  );
  ok(
    "uploaded image bytes preserved",
    Buffer.from(await download.arrayBuffer()).equals(png),
    true,
  );
  const coverRevision = () =>
    (
      db.prepare("SELECT updated_at FROM articles WHERE id=?").get(id) as {
        updated_at: string;
      }
    ).updated_at;
  ok(
    "nonexistent cover rejected",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          updatedAt: coverRevision(),
          coverId: "00000000-0000-4000-8000-000000000001",
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "external cover URL rejected",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          updatedAt: coverRevision(),
          coverId: "https://example.test/image.png",
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "save article cover",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          status: "published",
          updatedAt: coverRevision(),
          coverId: media.id,
          coverAlt: "Cover QA accessible description",
        },
        adminCookie,
      )
    ).status,
    200,
  );
  const coverPage = await (
    await fetch(base + "/posts/integration-test")
  ).text();
  ok(
    "article renders cover and accessible description",
    coverPage.includes('alt="Cover QA accessible description"') &&
      coverPage.includes('class="article-cover article-cover-hero"') &&
      coverPage.includes(media.url),
    true,
  );
  ok(
    "cover included in social sharing metadata",
    coverPage.includes('property="og:image"') &&
      coverPage.includes('name="twitter:card" content="summary_large_image"'),
    true,
  );
  ok(
    "home renders article cover",
    (await (await fetch(base + "/")).text()).includes(
      'class="article-cover article-cover-card"',
    ),
    true,
  );
  ok(
    "cover image deletion blocked",
    (await write("/api/admin/media", { id: media.id }, adminCookie, "DELETE"))
      .status,
    409,
  );
  ok(
    "stale article editor cannot replace cover",
    (
      await write(
        "/api/admin/articles",
        { ...data, id, updatedAt: "stale", coverId: null },
        adminCookie,
      )
    ).status,
    409,
  );
  ok(
    "older editor payload preserves cover",
    (
      await write(
        "/api/admin/articles",
        { ...data, id, status: "published", updatedAt: coverRevision() },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "cover retained after older payload",
    (
      db.prepare("SELECT cover_media_id FROM articles WHERE id=?").get(id) as {
        cover_media_id: string;
      }
    ).cover_media_id,
    media.id,
  );
  ok(
    "remove article cover",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          status: "published",
          updatedAt: coverRevision(),
          coverId: null,
          coverAlt: "",
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "removed cover no longer rendered",
    (await (await fetch(base + "/posts/integration-test")).text()).includes(
      'class="article-cover article-cover-hero"',
    ),
    false,
  );
  const resumeData = {
    name: "Resume QA Name",
    headline: "Resume QA Role",
    summary: "Resume QA private summary",
    content: "## 工作经历\n\nResume QA experience\n\n<script>alert(1)</script>",
    photoId: media.id,
    published: false,
    revision: 0,
  };
  ok(
    "anonymous resume write blocked",
    (await write("/api/admin/resume", resumeData)).status,
    401,
  );
  ok(
    "reader resume write blocked",
    (await write("/api/admin/resume", resumeData, readerCookie)).status,
    403,
  );
  ok(
    "cross-origin resume write blocked",
    (
      await write(
        "/api/admin/resume",
        resumeData,
        adminCookie,
        "POST",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  ok(
    "resume draft saves",
    (await write("/api/admin/resume", resumeData, adminCookie)).status,
    200,
  );
  const draftResume = await (await fetch(base + "/resume")).text();
  ok(
    "draft resume private including metadata",
    draftResume.includes(resumeData.summary) ||
      draftResume.includes(resumeData.name) ||
      draftResume.includes(media.url),
    false,
  );
  ok(
    "draft resume absent from sitemap",
    (await (await fetch(base + "/sitemap.xml")).text()).includes("/resume"),
    false,
  );
  const resumeEditor = await (
    await fetch(base + "/admin/resume", { headers: { cookie: adminCookie } })
  ).text();
  ok(
    "resume editor restores saved draft",
    resumeEditor.includes(resumeData.summary) &&
      resumeEditor.includes(media.id),
    true,
  );
  ok(
    "stale resume save rejected",
    (await write("/api/admin/resume", resumeData, adminCookie)).status,
    409,
  );
  ok(
    "missing resume photo rejected",
    (
      await write(
        "/api/admin/resume",
        {
          ...resumeData,
          photoId: "00000000-0000-4000-8000-000000000001",
          revision: 1,
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "invalid resume photo rejected",
    (
      await write(
        "/api/admin/resume",
        {
          ...resumeData,
          photoId: "https://untrusted.example/photo",
          revision: 1,
        },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "empty published resume rejected",
    (
      await write(
        "/api/admin/resume",
        { ...resumeData, content: " ", published: true, revision: 1 },
        adminCookie,
      )
    ).status,
    400,
  );
  ok(
    "draft resume photo deletion blocked",
    (await write("/api/admin/media", { id: media.id }, adminCookie, "DELETE"))
      .status,
    409,
  );
  ok(
    "resume publishes",
    (
      await write(
        "/api/admin/resume",
        { ...resumeData, published: true, revision: 1 },
        adminCookie,
      )
    ).status,
    200,
  );
  const publicResume = await (await fetch(base + "/resume")).text();
  ok(
    "public resume displays photo and experience",
    publicResume.includes(resumeData.name) &&
      publicResume.includes("Resume QA experience") &&
      publicResume.includes(media.url),
    true,
  );
  ok(
    "resume Markdown cannot inject script",
    publicResume.includes("<script>alert(1)</script>"),
    false,
  );
  ok(
    "published resume in sitemap",
    (await (await fetch(base + "/sitemap.xml")).text()).includes("/resume"),
    true,
  );
  ok(
    "resume can withdraw publication and remove photo",
    (
      await write(
        "/api/admin/resume",
        {
          ...resumeData,
          photoId: null,
          content: `Resume QA experience\n![Photo](${media.url})`,
          revision: 2,
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "withdrawn resume hidden",
    (await (await fetch(base + "/resume")).text()).includes(
      "Resume QA experience",
    ),
    false,
  );
  ok(
    "resume inline image deletion blocked",
    (await write("/api/admin/media", { id: media.id }, adminCookie, "DELETE"))
      .status,
    409,
  );
  ok(
    "resume image references removable",
    (
      await write(
        "/api/admin/resume",
        {
          ...resumeData,
          photoId: null,
          content: "Resume QA retained draft",
          revision: 3,
        },
        adminCookie,
      )
    ).status,
    200,
  );
  const imageRevision = (
    db.prepare("SELECT updated_at FROM articles WHERE id=?").get(id) as {
      updated_at: string;
    }
  ).updated_at;
  ok(
    "embed uploaded image",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          status: "published",
          content: `${data.content}\n![QA](${media.url})`,
          updatedAt: imageRevision,
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "referenced image deletion blocked",
    (await write("/api/admin/media", { id: media.id }, adminCookie, "DELETE"))
      .status,
    409,
  );
  ok(
    "oversized JSON rejected",
    (
      await write(
        "/api/admin/articles",
        { text: "x".repeat(513000) },
        adminCookie,
      )
    ).status,
    413,
  );
  const discussion = await write(
    "/api/discussions",
    { title: "QA topic", content: "QA discussion body" },
    readerCookie,
  );
  ok("reader starts discussion", discussion.status, 200);
  const topic = await discussion.json();
  ok(
    "discussion detail readable",
    (await fetch(base + `/discussions/${topic.id}`)).status,
    200,
  );
  const topicLike = { target: "discussion", id: topic.id, liked: true };
  ok(
    "reader can like discussion",
    await (await write("/api/likes", topicLike, readerCookie, "PUT")).json(),
    { count: 1, liked: true },
  );
  ok(
    "discussion duplicate like remains one",
    await (await write("/api/likes", topicLike, readerCookie, "PUT")).json(),
    { count: 1, liked: true },
  );
  ok(
    "discussion unlike works",
    await (
      await write(
        "/api/likes",
        { ...topicLike, liked: false },
        readerCookie,
        "PUT",
      )
    ).json(),
    { count: 0, liked: false },
  );
  ok(
    "discussion can be liked again",
    await (await write("/api/likes", topicLike, readerCookie, "PUT")).json(),
    { count: 1, liked: true },
  );
  const likedTopic = await (
    await fetch(base + `/discussions/${topic.id}`, {
      headers: { cookie: readerCookie },
    })
  ).text();
  ok(
    "discussion like state and share control visible",
    likedTopic.includes('aria-pressed="true"') && likedTopic.includes("分享"),
    true,
  );
  const replyRegistration = await write("/api/auth/sign-up/email", {
    email: "reply-reader@example.test",
    password,
    name: "QA Reply Reader",
  });
  assert.equal(replyRegistration.status, 200);
  const replyCookie = replyRegistration.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  ok(
    "reader replies to discussion",
    (
      await write(
        "/api/comments",
        {
          articleId: topic.id,
          target: "discussion",
          content: "QA reply for moderation",
        },
        replyCookie,
      )
    ).status,
    200,
  );
  const reply = db
    .prepare("SELECT id FROM replies WHERE discussion_id=?")
    .get(topic.id) as { id: string };
  ok(
    "unapproved discussion reply hidden",
    (await (await fetch(base + `/discussions/${topic.id}`)).text()).includes(
      "QA reply for moderation",
    ),
    false,
  );
  ok(
    "discussion reply approved",
    (
      await write(
        "/api/admin/manage",
        { type: "reply", id: reply.id, approved: true },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "approved discussion reply visible",
    (await (await fetch(base + `/discussions/${topic.id}`)).text()).includes(
      "QA reply for moderation",
    ),
    true,
  );
  for (const url of [
    "/admin/articles",
    "/admin/comments",
    "/admin/media",
    "/admin/settings",
    "/admin/users",
  ])
    ok(
      `${url} serves admin`,
      (await fetch(base + url, { headers: { cookie: adminCookie } })).status,
      200,
    );
  ok(
    "discussion deletion",
    (
      await write(
        "/api/admin/manage",
        { type: "discussion", id: topic.id },
        adminCookie,
        "DELETE",
      )
    ).status,
    200,
  );
  ok(
    "discussion replies cascade",
    (
      db
        .prepare("SELECT COUNT(*) AS count FROM replies WHERE discussion_id=?")
        .get(topic.id) as { count: number }
    ).count,
    0,
  );
  ok(
    "discussion likes cascade",
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM discussion_likes WHERE discussion_id=?",
        )
        .get(topic.id) as { count: number }
    ).count,
    0,
  );
  ok(
    "deleted discussion cannot be liked",
    (await write("/api/likes", topicLike, readerCookie, "PUT")).status,
    404,
  );
  updatedAt = (
    db.prepare("SELECT updated_at FROM articles WHERE id=?").get(id) as {
      updated_at: string;
    }
  ).updated_at;
  ok(
    "schedule publication",
    (
      await write(
        "/api/admin/articles",
        {
          ...data,
          id,
          status: "published",
          date: new Date(Date.now() + 86400000).toISOString(),
          updatedAt,
        },
        adminCookie,
      )
    ).status,
    200,
  );
  ok(
    "future article hidden",
    (await fetch(base + "/posts/integration-test")).status,
    404,
  );
  ok(
    "scheduled article cannot be liked",
    (await write("/api/likes", articleLike, readerCookie, "PUT")).status,
    404,
  );
  ok(
    "future article absent from sitemap",
    (await (await fetch(base + "/sitemap.xml")).text()).includes(
      "/posts/integration-test",
    ),
    false,
  );
  ok(
    "delete article",
    (await write("/api/admin/articles", { id }, adminCookie, "DELETE")).status,
    200,
  );
  ok(
    "related comments removed",
    (
      db
        .prepare("SELECT COUNT(*) AS count FROM comments WHERE article_id=?")
        .get(id) as { count: number }
    ).count,
    0,
  );
  ok(
    "article likes cascade",
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM article_likes WHERE article_id=?",
        )
        .get(id) as { count: number }
    ).count,
    0,
  );
  ok(
    "related votes removed",
    (
      db.prepare("SELECT COUNT(*) AS count FROM votes").get() as {
        count: number;
      }
    ).count,
    0,
  );
  ok(
    "unreferenced image deletion",
    (await write("/api/admin/media", { id: media.id }, adminCookie, "DELETE"))
      .status,
    200,
  );
  ok("deleted image returns 404", (await fetch(base + media.url)).status, 404);
  const changed = await write(
    "/api/auth/change-password",
    {
      currentPassword: password,
      newPassword: password + "changed",
      revokeOtherSessions: true,
    },
    readerCookie,
  );
  ok("password change succeeds", changed.status, 200);
  const loggedOut = await write("/api/auth/sign-out", {}, adminCookie);
  ok("sign out", loggedOut.status, 200);
  ok(
    "signed-out post like blocked",
    (await write("/api/likes", articleLike, adminCookie, "PUT")).status,
    401,
  );
  ok(
    "signed-out session cannot write",
    (await write("/api/admin/articles", {}, adminCookie)).status,
    401,
  );
  db.prepare("DELETE FROM articles").run();
  const repeated = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/setup.ts"],
    { env, encoding: "utf8" },
  );
  ok("setup can run again", repeated.status, 0);
  ok(
    "setup preserves saved resume",
    (
      db.prepare("SELECT content FROM resume WHERE id=1").get() as {
        content: string;
      }
    ).content,
    "Resume QA retained draft",
  );
  ok(
    "setup does not restore deleted samples",
    (
      db.prepare("SELECT COUNT(*) AS count FROM articles").get() as {
        count: number;
      }
    ).count,
    0,
  );
  console.log(
    `\n${checks} integration checks passed; isolated database and uploads removed.`,
  );
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", () => resolve());
  });
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
