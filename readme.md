# Junhao Xue Blog

基于 Next.js 16.4、React 19.3、TypeScript、Better Auth 1.7 和 SQLite 的个人博客，面向 `xuejunhao.com`，前台和管理后台由同一套全栈应用提供。

## 本机使用

需要 Node.js 24。本机项目位于 `/Users/sensespark/Workspace/blog`。

```bash
npm run install:web
npm run setup
npm run build
npm run local:start
```

- 首页：http://localhost:3000
- 后台：http://localhost:3000/admin
- 初始管理员：`admin@xuejunhao.com`，随机密码保存在 `web/local-admin.txt`，登录后可在“我的账号”修改。
- 日志：`web/data/local-service.log`
- 停止：`npm run local:stop`；状态：`npm run local:status`
- 开发：`npm run dev`；前台生产运行：`npm start`

后台可编写及预览 Markdown，管理草稿、公开与定时文章、分类、标签、友链、图片、评论与讨论审核、读者和管理员角色。读者可注册、登录、改名和修改密码、评论、点赞、发起讨论及回复。前台提供主题筛选、搜索、归档、明暗主题、移动布局、RSS、站点地图和文章 SEO。

每篇文章末尾都有“GitHub 记录”区域。在后台编辑文章时，点击“添加 GitHub 记录”，填写相关仓库、提交或 PR 的 HTTPS 地址与可选说明；每篇最多 12 条，可删除并随文章保存，打开排版预览时也能预览记录。公开页面显示记录类型、仓库名、提交短哈希或 PR 编号，点击跳转 GitHub。未关联的文章显示明确提示与个人 GitHub 入口，既有文章不会被自动填入无关记录。链接保存在本机数据库，不需要 GitHub Token，也不依赖 API 配额；不自动拉取提交内容或 PR 状态。

界面采用简洁的灰阶配色、居中阅读区域和圆角控件，支持浅色与深色主题。首页直接展示搜索、分类筛选和文章列表，移除大幅介绍、装饰图案、英文眉题和页面区块小标题；阅读、归档、关于、登录和后台使用相同颜色与控件。文章标题、正文中的 Markdown 结构及表单标签保留。

文章、友链、讨论、GitHub 关联及后台统计与图片卡片复用 `surface-card` 样式：20px 圆角、1px 细边框、桌面 24px／手机 20px 内边距，明暗主题保持一致；链接悬停仅轻微改变背景和边框，尊重减少动态效果设置。参考 [OpenAI 官方 UI 规范](https://developers.openai.com/plugins/concepts/ui-guidelines) 的圆角、留白和文字层级原则；具体尺寸为本站设计选择，并非官方统一像素要求。

三篇预置文章均标明“示例”，可以在后台替换或删除；示例文章不进入 RSS 或文章站点地图。初始化脚本不会覆盖已有账号或文章。数据库、图片、凭据、构建产物和本机验收资料均由 Git 忽略。

## 目录

- `web/`：新版完整应用和锁文件。
- `legacy/`：原 Laravel 5.8 / Vue 2 源码原样归档，保留版权与历史，默认不运行。
- `docs/DEPLOYMENT.md`：服务器、Docker、反向代理、域名和备份说明。
- `.github/workflows/ci.yml`：安装、类型、构建、隔离接口回归与产物检查。

当前 checkout 最初未提供旧数据库或已运行实例；新版只初始化示例资料，未声称迁移旧站内容或旧密码。旧项目的第三方登录、邮件通知、关注及细粒度自定义角色不在本次新版交付范围；已接入的管理员／读者权限、密码登录、文章与社区核心功能可独立使用。

## 验证与备份

```bash
npm run typecheck
npm run build
npm test
cd web
npm run backup
```

接口回归使用临时数据库、临时图片目录和独立 3001 端口，结束后自动清理，不修改本机博客资料。数据库使用 WAL 与在线备份 API；不要在运行中只复制主 SQLite 文件。图片备份为现有文件的副本；需要严格一致备份时，在短暂停止写入后进行。凭据文件另行私密保存，不提交到仓库。

代码托管在本仓库。完整博客需要 Node.js 服务器，GitHub Pages 无法运行登录和数据库后台。服务器信息尚未提供，本轮只部署本机，正式域名解析和证书保持待上线。
