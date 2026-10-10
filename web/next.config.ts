import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: process.env.BLOG_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
  // 首次本机构建的动态上传路径触发全项目追踪，local-admin.txt 被带入
  // standalone 目录；运行数据与凭据必须从部署产物显式排除。
  outputFileTracingExcludes: {
    "*": [
      "./data/**",
      "./uploads/**",
      "./local-admin.txt",
      "./.env*",
      "./test-results/**",
    ],
  },
};

export default config;
