import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "data");
fs.mkdirSync(directory, { recursive: true });
const pidFile = path.join(directory, "local-service.json");
const logFile = path.join(directory, "local-service.log");
function startTime(pid) {
  try {
    return execFileSync("/bin/ps", ["-p", String(pid), "-o", "lstart="], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}
function current() {
  try {
    const state = JSON.parse(fs.readFileSync(pidFile, "utf8"));
    return startTime(state.pid) === state.startTime && state.startTime
      ? state
      : null;
  } catch {
    return null;
  }
}
const action = process.argv[2];
const state = current();
if (action === "status") {
  console.log(
    state
      ? `博客运行中（PID ${state.pid}）：http://localhost:3000`
      : "博客未通过此脚本启动。",
  );
  process.exit(0);
}
if (action === "stop") {
  if (state) {
    process.kill(state.pid, "SIGTERM");
    console.log("博客服务已停止。");
  } else console.log("没有本项目脚本启动的运行进程。");
  fs.rmSync(pidFile, { force: true });
  process.exit(0);
}
if (action !== "start") throw new Error("Use start, stop, or status");
if (state) {
  console.log("博客已运行：http://localhost:3000");
  process.exit(0);
}
if (!fs.existsSync(path.join(root, ".next", "BUILD_ID")))
  throw new Error("请先运行 npm run setup 和 npm run build。");
const probe = await fetch("http://localhost:3000/api/health").catch(() => null);
if (probe) throw new Error("3000 端口已被占用，请先停止已有服务。");
const log = fs.openSync(logFile, "a", 0o600);
const child = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
child.unref();
fs.closeSync(log);
for (let i = 0; i < 100; i++) {
  const response = await fetch("http://localhost:3000/api/health").catch(
    () => null,
  );
  if (response?.ok) {
    const time = startTime(child.pid);
    fs.writeFileSync(
      pidFile,
      JSON.stringify({ pid: child.pid, startTime: time }),
      { mode: 0o600 },
    );
    console.log(
      `本机博客已启动：http://localhost:3000\n后台：http://localhost:3000/admin\n日志：${logFile}`,
    );
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
try {
  process.kill(child.pid, "SIGTERM");
} catch {}
throw new Error(`启动失败，请查看 ${logFile}`);
