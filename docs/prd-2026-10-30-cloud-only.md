# PRD 1907：前置飞书绑定与报告仅存飞书

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-30 读取 revision 1907。版本 0.12.0。

## 业务变化

DSH 插件首页提供“绑定飞书”。启动调研前通过 lark-cli auth status --json --verify 核验用户身份、有效登录及文档/云盘所需权限；未绑定时前端打开绑定弹窗，后端 POST /api/tasks 返回 428，不创建任务、不启动 Agent。排队任务开始执行前再次核验；重试接口也需绑定。

绑定采用 lark-cli 的 split Device Flow：显式申请所需 scopes，返回真实官方授权链接和 PNG 二维码；扫码后由用户点击“我已授权”，后端执行 --device-code 并再次验证用户授权。device code 只在后端内存中留存；前端仅取得 flowId、授权网址和到期时间。不把 token/device code、原始 CLI 错误或完整身份对象写入接口、事件或日志。授权过期时重新发起；后端退出清理临时二维码。凭据由本机 lark-cli 管理，不存入工作台数据库。

新建原生调研 cloudOnly=true。Agent 在同一标准模式、完整访问 Session 中研究并直接将报告通过 stdin/内存写入指定飞书目录，回传仅包含 requestId、状态、真实文档链接或失败指引的元信息。工作台不创建 report JSON/Markdown、正文草稿、结构化报告或本地报告归档，不使用之前“本地报告生成后再上传”的两轮流程。数据库仍保存任务需求、配置、运行状态、Session ID 和飞书文档链接；DSH 自身继续管理会话历史。

工作台只有首页和 AI 会话。新建、未发布卡片和历史任务均进入原会话；已发布卡片直接打开飞书文档。原生对话移除“调研报告”页签及“上传飞书”按钮，仅保留返回、状态、飞书链接和原生消息输入。失败/中断卡片可重试，复用 Session 并先核对已有飞书交付，避免重复创建。未交付有效飞书链接即结束时显示失败；保存成功后结束本轮并保持会话供追问。

升级不自动删除既有本地历史文件。插件不再提供本地报告详情和备份下载，详情 API 不返回历史正文，列表不返回历史报告摘要，SSE 只发送状态；旧 CLI 适配器与独立 demo 验收仍保留。新云端流程不经过旧归档器。

## 接口

- GET /api/feishu-binding：核验后的绑定状态（无凭据）。
- POST /api/feishu-binding：发起或复用本次有效绑定流程。
- GET /api/feishu-binding/qr/:flowId：本次有效 PNG，no-store。
- POST /api/feishu-binding/complete：用户扫码后确认，body 仅接受 flowId。
- 原有根目录设置接口保留；新任务固定创建时的目录名字。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

新增后端用例：用户而非 bot 绑定、权限不足/CLI 缺失失败关闭、并发授权幂等、过期/恶意 URL/假 PNG 拒绝、敏感字段隔离、后端绕过前端仍拒绝、云端交付无本地报告/缓存、交付失败与重试复用会话、绑定失效时不启动 Agent。

浏览器覆盖真实绑定接口的二维码/用户确认流程、绑定前不启动任务、云端卡片与独立 AI 入口、无报告详情页。真实 DSH 隔离宿主验证原生会话创建/输入/追问/返回、云端回执、无本地报告。验收使用本机模拟模型、模拟 CLI 授权及飞书交付，不创建真实飞书报告。Windows 本轮没有实机宿主验证。

验收结果：85 项 Node、18 项 Chromium、真实隔离宿主、离线包与桌面 Node/Electron/ZIP 检查通过。两端已安装并重启加载 0.12.0，网页版 20 条、桌面版 9 条历史记录保留；本机已有飞书用户授权已通过服务端核验。
