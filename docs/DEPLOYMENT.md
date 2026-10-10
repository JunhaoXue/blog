# 部署到 xuejunhao.com

本轮已完成本机部署。待提供服务器账号和部署位置后，再执行正式发布及 DNS 变更。2026-10-10 的只读检查发现 `xuejunhao.com` 和 `www.xuejunhao.com` 均解析到 `47.84.35.132`，HTTPS 证书不匹配；不能据此认定这台机器就是本博客的目标服务器。

## Node.js 单实例部署

1. 在服务器安装 Node.js 24，用非 root 用户取得 GitHub 中的新版源码。
2. `cd web && npm ci`，运行时目录选用本机持久磁盘，SQLite 不放在网络共享磁盘。
3. 私有 `web/.env.local` 配置 `BETTER_AUTH_SECRET`（至少 32 随机字符）、`BETTER_AUTH_URL=https://xuejunhao.com`、`DATABASE_PATH` 和 `UPLOADS_PATH`。把该文件权限设为 600。
4. 运行 `npm run setup` 初始化官方认证表与博客数据。若指定 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 环境变量，它们只用于首次创建管理员；否则随机密码保存在私有 `local-admin.txt`。
5. 运行 `npm run build`，由进程管理服务以 `npm start` 启动，绑定 `127.0.0.1:3000`。后续部署只替换代码与构建目录，保留密钥、数据库和图片。
6. 配置反向代理及有效 HTTPS 证书，检查 `/api/health`、登录、图片、文章和评论链路后，切换域名。

本实现适用于个人博客的单机部署，不适合多个容器共享 SQLite 写入。后续若需要水平扩容，应先将博客数据访问层与 Better Auth 数据库适配器迁移到 PostgreSQL，并单独验证迁移数据与会话。

## Docker

在项目根目录保存私有 `.env`：

```dotenv
BETTER_AUTH_SECRET=your-at-least-32-character-random-secret
BETTER_AUTH_URL=https://xuejunhao.com
```

先创建 `web/data`、`web/uploads` 并让容器的 node 用户（UID 1000）拥有写入权限，然后执行：

```bash
docker compose up -d --build
docker compose logs -f blog
```

容器只将 3000 端口暴露到主机回环地址，通过反向代理提供公网访问。初始账号密码在持久卷 `web/data/local-admin.txt`（600 权限）；如果迁入本机资料，保留原管理员和原密钥。容器启动自动执行幂等初始化；构建不包含 `.env`、本机数据库、图片或管理员密码。

Dockerfile 与 Compose 配置已提供；若未在验收记录中注明容器构建通过，不应将其视为已执行的部署结果。

## Nginx 示例

有效证书路径需按实际签发结果调整。仅信任自己维护的反向代理；不要直接向公网开放应用端口。

```nginx
server {
    listen 80;
    server_name xuejunhao.com www.xuejunhao.com;
    return 301 https://xuejunhao.com$request_uri;
}
server {
    listen 443 ssl;
    server_name www.xuejunhao.com;
    ssl_certificate /etc/letsencrypt/live/xuejunhao.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xuejunhao.com/privkey.pem;
    return 301 https://xuejunhao.com$request_uri;
}
server {
    listen 443 ssl;
    server_name xuejunhao.com;
    ssl_certificate /etc/letsencrypt/live/xuejunhao.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xuejunhao.com/privkey.pem;
    client_max_body_size 11m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## DNS 和证书

| 主机 | 类型 | 值 |
| --- | --- | --- |
| `@` | A | 最终服务器公网 IPv4 |
| `www` | CNAME | `xuejunhao.com` |

IPv6 只有在服务器实际提供同等 HTTPS 服务时才添加 AAAA；已有 AAAA 需一并核对，防止部分访问落到旧站。域名验证和证书签发完成后再将 HTTP 跳转到 HTTPS。正式认证 URL、canonical、RSS 和站点地图均统一使用 `https://xuejunhao.com`；不要填写 GitHub 仓库地址作为 DNS 目标。

## 备份与恢复

- 在 `web/` 执行 `npm run backup`，在线数据库快照及图片副本保存到 `data/backups/<时间>/`。
- 定期将快照、图片和私有密钥备份到另一台机器；仓库中的代码无法代替内容备份。
- 恢复时停止应用，把数据库快照、图片和原密钥恢复到配置目录，处理旧 `-wal`、`-shm` 文件后重启，并验证登录和文章。
- 架构升级前备份。代码回退不会自动回退数据库结构，恢复方案要与实际版本对应。

公网发布前应补充站点运营所需的隐私告知、邮件验证和密码找回渠道，以及与服务器地区匹配的必要手续；当前本机版未配置邮件服务，也未替用户操作 DNS、购买服务或申请证书。
