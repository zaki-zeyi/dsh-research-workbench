> 历史 JSONL 适配说明。2026-10-26 起，生产入口使用原生 PTY，飞书保存及授权由终端 Agent 完成；本文中的 PUBLISH_MODE / 平台 token 指引已不适用。见 [新版规则](prd-2026-10-26.md)。

# Codex CLI 执行与前端会话

此页记录旧 JSONL 模式。当前默认已切换为原生 PTY 终端，见 [原生终端说明](native-terminal.md)。设置 `CODEX_TRANSPORT=json` 可保留本页描述的行为。

默认执行器已切换为本机 Codex CLI。旧任务保留历史，新创建的调研使用新的执行器。

## 启动与认证

```bash
codex --version
codex login status
# 未登录时自行执行 codex login 完成登录
npm run build
npm start
```

本次实现验证环境：`codex-cli 0.154.0`，已有 ChatGPT 登录状态。服务复用本机 CLI 的认证与模型配置，不读取认证文件、不要求将登录凭据填入前端。

本机原全局模型 `gpt-6.1-sol` 在实际 CLI 请求中被账号拒绝；本项目 `.env` 单独选择 CLI 缓存列出的 `gpt-5.6-sol`，已完成真实执行验证。没有修改全局 `~/.codex/config.toml`。其他环境可通过 `CODEX_MODEL` 指定该账号可用的模型，省略时沿用 CLI 默认值。

`.env` 可选配置：

```dotenv
RESEARCH_MODE=codex
CODEX_COMMAND=codex
CODEX_WORK_ROOT=./data/codex
CODEX_TIMEOUT_MS=600000
# CODEX_MODEL 留空或省略，沿用现有 CLI 配置
PUBLISH_MODE=local
```

如 `.env` 仍写 `RESEARCH_MODE=demo`，需改为 `codex` 并重启。飞书授权配置好后，可设置 `PUBLISH_MODE=feishu`；否则默认本地保存，不会假装飞书已发布。

## 数据链路

```text
前端调研 Prompt
  → 后端任务落库
  → spawn codex exec --json --sandbox read-only --output-schema report.schema.json -
  → stdin：原始 Prompt + 报告格式约定
  → stdout：Codex JSONL 事件
  → SQLite 持久化 + SSE 通知
  → 前端按 item.id 合并 started / updated / completed
```

每次执行有独立工作目录，记录 `thread.started` 返回的真实会话 ID。命令调用不经过 shell 拼接，Prompt 不放入命令行参数列表。执行以只读沙箱运行，`approval_policy=never`，不使用跳过沙箱开关。检索使用 CLI 的 live web search 配置。飞书发布凭据不传给 CLI 子进程。

模型的最终输出通过 JSON Schema 请求为报告，收到后仍由服务端校验；模型回复和命令执行事件立即保存，不等最终报告成功后才显示。执行失败、超时或用户取消时，已产生的消息和草稿仍可回看。停止任务会终止本次进程组，必要时升级为 SIGKILL。

## 前端展示

- 右侧“Codex 命令行对话”：助手回复、网页检索、命令执行、工具结果、运行状态与 token 用量。
- 命令显示完整命令、输出和退出码；同一条命令的更新合并到一张卡片。
- CLI 诊断日志折叠展示，保留排错信息。
- 会话自动滚动，用户向上浏览时停止跟随；重新回到底部后恢复。
- SSE 断开重连与页面刷新后，从持久记录恢复；不重新执行 Prompt。
- 新任务走 Codex；旧演示任务保持演示标识，不会伪装成真实命令行记录。

这是非交互式 CLI 会话的实时展示；目前没有向运行中的 CLI 追加消息或在前端输入任意终端命令的功能。

## 验收

```bash
npm run acceptance
```

新增 `tests/codex.test.mjs`：标准输入、真实子进程 JSONL、实时持久化、异常退出、取消与超时。新增 `AC-UI-05`：命令行消息与输出展示、事件合并、刷新回放且不重新执行。

这些自动测试使用模拟 CLI 子进程，避免消耗真实账号额度。真实 CLI 联调用单独的公开资料调研验证；结果见 `acceptance-report.md`。

实现依据 OpenAI Docs：[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)。
