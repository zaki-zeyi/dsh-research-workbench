# dsh-research-workbench

项目与插件包名：`dsh-research-workbench`，界面名称：「调研工作台」。源码：[GitHub](https://github.com/zaki-zeyi/dsh-research-workbench)。

根据 [飞书 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr) 实现的本地单用户 DSH 插件。以调研任务与报告为入口，复用宿主原生会话执行调研、追问与飞书保存。

**当前 PRD 修订 2036：扫码登录飞书账号，再选择已有应用或创建新应用。** 应用凭据自动保存到独立 CLI 配置，继续同账号个人文档授权；换账号重新扫码绑定对应应用。详见 [实现与验收](docs/prd-2026-11-02-qr-application.md)。安装包版本 0.18.2，[安装说明](docs/plugin-install.md)。

工作台已封装为可安装的 dsh 插件。 执行 `npm run plugin:install`，按输出命令启动 dsh 后点击侧栏“调研工作台”。[插件安装、架构与验收](docs/prd-2026-10-27-dsh-plugin.md)。

新版插件通过“绑定飞书”验证用户授权后，才允许启动原生调研。Agent 直接写入飞书，只回传文档链接；工作台不保存新报告正文或提供本地报告详情。历史数据不会在升级时删除。

## 启动

```bash
npm ci
npm run build
npm start
```

打开 [工作台](http://127.0.0.1:3088)。Node.js 需 ≥22.13。默认使用 Codex 原生终端；需本机已有 `codex` 登录。可在 `.env` 设置 `CODEX_MODEL`，不改动全局 CLI 模型。

```dotenv
RESEARCH_MODE=codex
PORT=3088
CODEX_MODEL=gpt-5.6-sol
```

`RESEARCH_MODE=demo` 是离线演示，不进行真实调研或保存飞书。旧 JSONL / Harness 适配器作为独立兼容模块保留；独立旧 CLI 模式继续使用 PTY；DSH 插件版新任务走宿主原生 Session。

## 飞书保存与授权

1. 安装并配置本机 `lark-cli`。首页点击“绑定飞书”，已有有效用户授权则直接使用；否则扫码后点击“我已授权”。后端通过 CLI 完成并验证授权，模型调用不参与绑定。
2. 绑定是新建和重试的前置条件。新原生任务直接写飞书，报告不经过本地 JSON/Markdown 或 SQLite 正文缓存；工作台只记录任务、Session、状态与文档链接。
3. 提供飞书文件夹链接时直接使用目录 ID；不填链接时首次创建默认目录并缓存 ID，后续复用。无需目录列表读取或文档搜索授权；已有同名文件夹请粘贴其链接，目录无权访问时显示真实失败指引。
4. 首页已发布卡片打开飞书文档，“AI会话”进入原生对话并可继续追问。工作台不提供报告详情页；新任务失败可在首页重试并复用原会话。

平台仅管理授权流程和交付元信息，不调用文档写入 API，不要求手动填写飞书 token。独立旧 CLI/demo 兼容路径保留，不作为新版插件云端流程。

## 独立旧 CLI 兼容

浏览器首次准备好后启动 CLI；刷新或断开 WebSocket 不结束 PTY。有效报告生成后结束调研轮次，保持终端连接；用户手动触发的上传单独作为后续轮次，生成授权二维码/失败指引或保存完成后再结束该轮。如轮次完成后仍重复工作，平台在短暂收尾后仅发送一次 Escape。终端继续连接，可输入新要求。

服务重启会结束操作系统进程，之后可通过 `codex resume` 恢复会话历史。后续追问的交付回执可更新飞书状态；自动归档的是首份报告，后续报告版本仍需独立扩展。

## 验收

```bash
npm run acceptance
```

执行 Node 业务/API/PTY/兼容适配器测试、生产构建和 Chromium 页面验收。测试使用临时数据库及交互式 PTY 测试进程，不访问真实模型或飞书账号。二维码测试使用 PNG 协议夹具，不表示真实扫码授权通过。

- [验收用例](docs/acceptance.md)
- [验收结果](docs/acceptance-report.md)
- [原生终端说明](docs/native-terminal.md)

## 实现

- `server/terminal.mjs`：Codex PTY、任务指引、轮次完成通知、Agent 回执监听、原始输出持久化及重连。
- `server/providers/codex-terminal.mjs`：校验报告并交给工作台归档，不执行飞书写入。
- `server/agent-delivery.mjs`：交付回执校验；本地归档器仅供旧 CLI 兼容路径使用。
- `server/cloud-research.mjs`：云端报告指令与不含正文的飞书交付。
- `server/feishu-binding.mjs`：用户授权核验、二维码与 split Device Flow。
- `server/service.mjs`：任务队列、报告及执行记录、Agent 交付状态、错误恢复。
- `server/app.mjs`：本机 API、SSE、固定任务二维码的 PNG 展示。
- `src/TerminalPanel.jsx`：原生 xterm 终端、回放和继续输入。
- `src/main.jsx`：调研、历史记录、报告、Agent 交付链接和授权二维码。

SQLite WAL 保存任务、报告、会话事件、PTY 输出与交付状态。任务工作目录彼此独立，根据 2026-10-27 PRD，工作台启动的新建/恢复 Codex 进程默认采用 `danger-full-access`（当前用户文件系统和网络完整访问），审批策略为 `on-request`。权限仅作为子进程启动参数传入，不修改全局 Codex 配置，也不授予 root 或越过 macOS 隐私权限。平台限制本机 Host/Origin，客户端不能指定任意可执行文件或二维码文件路径。

完整访问规则见 [完整访问规则](docs/prd-2026-10-27.md)。已有正在运行的进程不会热切换权限，重新连接页面仅恢复原进程；在原终端结束并恢复会话后，新进程才使用新权限。
