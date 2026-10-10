import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import Database from "better-sqlite3";
const directory = mkdtempSync(path.join(tmpdir(), "junhao-blog-test-"));
const port = process.env.TEST_PORT || "3001";
const base = `http://localhost:${port}`;
const password = randomBytes(18).toString("hex");
const env = {
  ...process.env,
  BETTER_AUTH_URL: base,
  DATABASE_PATH: path.join(directory, "blog.sqlite"),
  UPLOADS_PATH: path.join(directory, "uploads"),
  BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
  ADMIN_EMAIL: "admin@example.test",
  ADMIN_PASSWORD: password,
  NEXT_TELEMETRY_DISABLED: "1",
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
  for (const url of [
    "/",
    "/archive",
    "/about",
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
  };
  const created = await write("/api/admin/articles", data, adminCookie);
  ok("create draft", created.status, 200);
  const { id } = await created.json();
  ok(
    "draft is private",
    (await fetch(base + "/posts/integration-test")).status,
    404,
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
