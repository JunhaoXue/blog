import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const destination = path.resolve(process.argv[2]);
const packages = path.resolve(process.argv[3]);
const lock = JSON.parse(await fs.readFile("package-lock.json", "utf8"));
await fs.mkdir(destination, { recursive: false, mode: 0o700 });
// First cloud startup failed because fs.cp rewrote Turbopack's relative SQLite
// alias into an absolute macOS path. Preserve relocatable links and verify them.
await fs.cp(".next/standalone", destination, {
  recursive: true,
  verbatimSymlinks: true,
});
await fs.cp(".next/static", path.join(destination, ".next/static"), {
  recursive: true,
});
await fs.cp("public", path.join(destination, "public"), { recursive: true });
for (const name of [
  "sharp-darwin-arm64",
  "sharp-libvips-darwin-arm64",
  "sharp-darwin-x64",
  "sharp-libvips-darwin-x64",
]) {
  await fs.rm(path.join(destination, "node_modules/@img", name), {
    recursive: true,
    force: true,
  });
}
const nativeDirectory = path.join(
  destination,
  "node_modules/better-sqlite3/prebuilds",
);
await fs.rm(nativeDirectory, { recursive: true });
await fs.mkdir(nativeDirectory);
await fs.copyFile(
  "node_modules/better-sqlite3/prebuilds/linux-x64.node",
  path.join(nativeDirectory, "linux-x64.node"),
);
for (const [name, version] of [
  ["sharp-linux-x64", "0.35.5"],
  ["sharp-libvips-linux-x64", "1.3.4"],
]) {
  const archive = path.join(packages, `img-${name}-${version}.tgz`);
  const integrity =
    "sha512-" +
    createHash("sha512")
      .update(await fs.readFile(archive))
      .digest("base64");
  if (lock.packages[`node_modules/@img/${name}`].integrity !== integrity)
    throw new Error(`Package integrity mismatch: ${name}`);
  const output = path.join(destination, "node_modules/@img", name);
  await fs.mkdir(output);
  execFileSync("tar", ["-xzf", archive, "-C", output, "--strip-components=1"]);
}
async function check(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (/^\.env|^blog\.sqlite|^local-admin\.txt$/.test(entry.name))
      throw new Error("Private runtime file found in release");
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await fs.realpath(file);
      if (!target.startsWith(destination + path.sep))
        throw new Error("Release symlink escapes artifact");
    }
    if (entry.isDirectory()) await check(file);
  }
}
await check(destination);
for (const name of ["data", "uploads"]) {
  if (await fs.stat(path.join(destination, name)).catch(() => null))
    throw new Error("Private runtime directory found in release");
}
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
await fs.writeFile(
  path.join(destination, "release.json"),
  JSON.stringify(
    {
      commit,
      platform: "linux-x64",
      node: "24",
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(`Linux release prepared: ${destination}`);
if (process.argv[4]) {
  // The first macOS archive carried provenance xattrs and produced repeated
  // Linux tar warnings. Releases contain code only; omit host filesystem metadata.
  execFileSync(
    "tar",
    [
      "--no-xattrs",
      "-C",
      destination,
      "-czf",
      path.resolve(process.argv[4]),
      ".",
    ],
    {
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    },
  );
}
