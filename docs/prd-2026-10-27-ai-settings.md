# PRD 修订 1070：配置AI与 dsh tui 终端

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，读取到 revision 1070。新增“配置AI”弹窗：选择 Codex/dsh tui、API Key、base_url（默认 DeepSeek 官方）。新调研使用所配置的命令行，完整访问，保留原有历史报告与上传流程。

## 功能

工作台右上角“配置AI”提供 Agent、API Key、Base URL 三项配置；Codex 可选择使用本机登录。密钥留空可保持同 Agent 原密钥，使用本机登录则清除新任务的密钥引用。配置保存后刷新仍保留，密钥不回显。

新任务保存 Agent、Base URL 和配置版本 ID，API Key 不进入任务、事件、终端元数据或进程参数。每个配置版本的密钥用 AES-256-GCM 加密保存，密文与本机密钥文件放在 data 目录，POSIX 上文件权限为 0600。历史任务引用创建时的版本，新设置不切换正在运行或历史任务的 Agent/凭据。备份时需保留完整 data 目录；它包含私有配置，不应公开分享。

- Codex：保留原 CLI 的启动、会话恢复和 notify 机制。无 API Key 时沿用本机登录及原模型设置；自定义 API 使用子进程环境变量与单次 provider 覆盖，不修改全局配置。
- dsh tui：启动独立 `dsh --profile tui --patch <任务覆盖文件>`，使用所填 key 和 URL，默认官方根地址自动映射为 `/anthropic` Messages 端点。任务覆盖强制选择 deepseek-official/deepseek-flash、完整访问，禁用该进程的账号 provider 回退，不改变共享 profile。
- DSH 工作台桥接插件订阅原生 session/created 和 session/event 的 turn/end，保存原生会话 ID 与轮次结束通知。界面与会话均就绪后仅提交一次“读取本次任务文件”的指令。后续上传通过同一 PTY 投递，保持原会话。
- 终端名称按任务显示 Codex 或 dsh tui；历史默认报告、AI对话、飞书授权二维码、上传重试规则继续有效。

## 接口

- `GET /api/ai-settings`：仅返回 agent、baseUrl、apiKeyConfigured、dshAvailable。
- `PUT /api/ai-settings`：接收 agent、baseUrl、可选 apiKey / clearApiKey，响应仍是脱敏配置。
- 新建任务的 ai 字段保存 agent、baseUrl、configId；旧任务无 ai 时默认为 Codex。

URL 不接受内嵌凭据、query、fragment 或非 HTTP(S) 协议；远程地址要求 HTTPS，本机模拟接口可 HTTP。Codex + DeepSeek 官方 API Key 组合会明确提示使用 dsh tui，而非保存一个不能工作的 Responses 配置。

## 协议及安装边界

Codex 自定义 API 需要 Responses API；dsh 当前 DeepSeek 适配器使用 Messages API，不能把任意 Chat Completions 代理当作兼容端点。对应产品提示显示在配置窗口中。Codex 模型继续使用已有 CLI / CODEX_MODEL 设置；PRD 本次未增加模型选择字段。

本机验证版本为 dsh 0.2.1-rc.2 + @lingxi-ai-cn/dsh-tui 0.1.14-rc.2。TUI 需独立安装，并与其外部 dsh CLI 匹配。未安装或缺少 Key 会显示可处理的配置错误。Windows Codex 沿用既有适配，第三方 dsh tui 的 Windows 真实运行尚未验证。

## 验收

```bash
npm run acceptance
node scripts/dsh-smoke.mjs
node scripts/dsh-roundtrip.mjs
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

53 项 Node 测试与 13 项 Chromium 用例通过。新增测试覆盖加密保存/脱敏读取、参数校验与跨来源写入拒绝、旧配置快照、DSH 自动提交与轮次完成、切换配置后仍使用原终端上传、弹窗持久化及密钥不回显。

真实 dsh tui 启动与桥接验证通过。独立临时 DSH_HOME 使用本机模拟 Messages SSE 接口，完成一次用户任务提交和原生 turn/end，保留连接；DSH 还会自动发起独立的会话标题生成请求，验收按主对话请求与标题请求分别统计。未调用外部付费模型或执行真实飞书上传。

0.5.0 桌面 ZIP / 通用 tgz 的离线安装、普通 Node 与桌面 Electron 运行时页面/原生 PTY 验收通过。服务 3088 已在确认无活动调研/终端后更新。

官方参考：[Codex provider 参数示例](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)；DSH/TUI 配置、原生 session/event 与权限接口按本机实际安装版本的类型声明和实现核对。
