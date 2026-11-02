# PRD 修订 1101：沿用 DSH 默认模型

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-28 通过 lark-cli 读取 revision 1101。配置AI一行调整为只选择 Codex / dsh tui；“Dsh tui默认使用dsh已经配好的默认模型”。

## 实现

配置窗口只保留 Agent 选择和对应说明。PUT /api/ai-settings 仅接受 `{ "agent": "codex" | "dsh" }`，保存后刷新保留。新配置使用 configuration=native，无需在工作台再次填写 API Key 或 Base URL；DSH 未安装时显示明确的安装提示。

原生 DSH 启动仍为 `dsh --profile tui --patch <任务覆盖文件>`。该任务文件仅添加终端桥接、完整系统权限，不写入默认模型、Provider、接口地址、模型密钥、语言和账号禁用设置；默认模型由 DSH 的全局及 TUI profile 配置决定，原生账号登录继续有效。不修改 DSH 配置文件。工作台旧的 RESEARCH_DSH_API_KEY 不注入新任务。英文 prompt 和中文输入提示符均能触发一次任务提交。

现有自定义配置只用于已有历史任务的读取与恢复。升级时为未来任务创建一份原生配置，保留历史加密版本和 Agent 选择；错误旧密钥也不阻碍迁移。不会切换已运行终端的配置。手动重试继续沿用原 Agent，并采用当前配置；模型凭据错误提示用户在 DSH 检查模型配置或登录。

报告生成、历史默认报告、AI 对话、原会话追加指令、手动上传飞书及授权二维码规则不变。终端本轮结束保持连接。

## 验收脚本

```bash
npm run acceptance
node scripts/dsh-smoke.mjs
node scripts/dsh-roundtrip.mjs
node scripts/dsh-roundtrip.mjs --zh
node scripts/dsh-roundtrip.mjs --credential-failure
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

- tests/native-ai.test.mjs：无需密钥保存、迁移损坏旧密钥且保留历史、缺少 TUI、覆盖文件不包含模型或 Provider 设置、原生任务不传入旧环境变量。
- AC-UI-13：配置窗口无密钥和地址字段、只选 DSH 即可保存、刷新持久化、DSH 任务运行和历史 Agent 不变、原终端上传。
- AC-UI-14：请求仅提交 Agent；未安装 DSH 时显示错误，可在条件恢复后继续保存。
- scripts/dsh-roundtrip.mjs：隔离的 DSH_HOME 内预配置模拟模型接口，真正的 dsh tui 读取该原生配置；主对话仅提交一次，turn/end 后保留连接。覆盖英文、中文及模拟401错误，不调用外部模型。

完整验收：60 项 Node 测试、14 项 Chromium 用例通过。原生 TUI 的英文、中文、模拟401路径通过。发布版本 0.6.0，Windows/macOS 共用桌面 ZIP 与通用 tgz；Windows 实机 TUI 本轮未执行。
