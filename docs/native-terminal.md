> 当前上传流程以 [PRD 修订 792](prd-2026-10-27-manual-upload.md) 为准：报告生成后待命，用户点击“上传飞书”才交给 Agent 保存；以下早期自动交付说明已被该规则替代。

# 原生 Codex 终端

默认 Codex 接入已改为 **node-pty → WebSocket → xterm.js**。页面直接渲染原始终端字符、ANSI 颜色和光标，不把命令行输出重新组装成聊天卡片。

## 使用

```bash
npm ci
npm run build
npm start
```

打开工作台，新建调研后直接进入终端。已有调研可点击“打开 Codex 原生终端”，恢复原有 Codex Session。终端支持输入、粘贴、方向键、Ctrl+C、滚动、全屏与窗口尺寸同步。

当前 Codex 生产入口固定使用 PTY；旧的 JSONL 适配器仅作兼容模块保留。模型仍使用项目的 `CODEX_MODEL`，不修改全局 CLI 配置。

## 会话与报告

- 浏览器首次准备好终端后启动进程，避免启动期间丢失终端设备查询。
- 页面刷新或 WebSocket 断开不会终止已经启动的进程；重新连接回放持久化的原始输出并接回同一个 PTY。
- 终端输出及尺寸变更保存在 SQLite 独立表中；按键直接送入 PTY，不单独记录用户的原始按键。
- “结束终端”终止本次 PTY。服务重启后运行态标记中断，可通过原生 `codex resume` 重新打开；不会声称服务重启后仍保留同一个操作系统进程。
- 新调研的完整 Prompt 写到该任务工作目录；启动 Codex 读取它。首次生成的结构化报告由 Codex 写入指定文件，服务校验后归档和发布。有效报告验收后先展示并归档，Agent 继续执行飞书保存。只有收到 Agent 的保存成功、待授权或失败回执后才进入收尾：优先等待 Codex 原生轮次完成通知；若 2 秒后仍重复工作，则只发送一次 Escape 中断当前轮次，保留 PTY 和 WebSocket。页面显示“等待新要求”，可直接追问。用户新输入会撤销收尾计时，避免旧任务中断新要求。
- 后续手动追问和改文件仍是 CLI 内的原生交互；本版本自动归档首份报告，不自动把每次追问都转成新的报告版本。
- 已有 JSONL 模式的会话通过真实 Session ID 恢复，已有报告保留，历史不会转换成伪终端输出。

2026-10-27 起，交互式 Codex 使用任务工作目录，默认以 `--sandbox danger-full-access --ask-for-approval on-request` 启动，拥有当前用户的文件系统和网络访问权限，操作可按需请求确认。此设置仅作用于工作台启动的子进程，不改变全局配置或操作系统权限。新建和恢复启动共用同一权限参数，普通页面刷新不重启进程或热切换权限。页面标识读取该进程持久化的实际启动模式，缺少权限记录的旧会话不冒充完整访问。飞书凭据不传给终端进程。WebSocket 限制本机 Host 与允许的 Origin，客户端不能指定任意可执行文件或目录。

## 实现位置

- `server/terminal.mjs`：PTY 生命周期、原始输出持久化、输入、resize、WebSocket。
- `server/providers/codex-terminal.mjs`：调研 Prompt 与报告文件交付。
- `src/TerminalPanel.jsx`：原生终端、重连、全屏、停止与查看报告。
- `scripts/terminal-turn-notify.mjs`：通过进程级 `notify` 配置接收 Codex `agent-turn-complete`，仅保存轮次/会话 ID 和完成时间，不保存回调正文、不修改全局 CLI 配置。
- `scripts/prepare-pty.mjs`：修复 node-pty macOS npm 预编译 helper 的可执行位，随安装自动执行。

## 验收

```bash
npm run acceptance
```

`tests/terminal.test.mjs` 使用真实 PTY 和交互测试进程验证：ANSI 输出、键盘双向通信、尺寸同步、断线回放、报告完成后继续输入、Origin 校验及失败重试。`AC-UI-06` 在 Chromium 中验证真实 xterm 输入、刷新重连、报告交付和返回终端。

本机真实 Codex CLI 验收：已恢复“英特尔最新的gpu”任务的会话 `01a167eb-1897-70d0-91e3-d1834dcbaff1`，前端显示原生 CLI 历史，并在终端中执行 `/status`，返回原生会话状态和输入框。

![原生终端实测](screenshots/native-terminal-live.jpg)

轮次结束通知参考 [Codex 高级配置](https://learn.chatgpt.com/docs/config-file/config-advanced)。终端连接状态和 AI 轮次活动状态分开持久化，刷新回放不重新发送调研 Prompt。

新版飞书保存/授权及二维码协议见 [PRD 更新](prd-2026-10-26.md)。平台不执行飞书保存；“上传飞书”按钮仅把现有报告的保存指令转交终端 Agent。
