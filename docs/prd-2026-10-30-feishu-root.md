# PRD 修订 1742：飞书根目录与自动保存

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-30 读取 revision 1742。发布版本 0.11.0。

新增首页“设置飞书根目录”弹窗，默认“调研工作台”，允许修改文件夹名字。设置持久化到工作台 SQLite settings；新任务保存目录快照，改名不会迁移旧文档，也不会把进行中或历史任务改到新目录。目录在首次上传时由原会话 Agent 核对并创建。

新建 DSH 原生调研沿用 standard 与完整访问。默认 Prompt 包含“报告上传到飞书云盘根目录”。结构化报告通过校验且原生调研轮次结束后，平台自动给同一 Session 发送独立上传文件指令，不重复搜索或调研；保留本地备份。Agent 用用户身份通过 lark-cli 分页查找云盘根目录的目标文件夹，精确匹配名字，存在则复用、不存在才新建，多个同名或查询失败时回传错误，不退回其他目录。保存通过 docs +create --parent-token 指向核对过的目录。

平台继续只负责转交与回执展示，不持有或调用飞书写入 API。未授权时展示 Agent 回传的真实授权链接及二维码，扫码后在原生会话回复“已授权”；失败保留报告供单独重试。原生对话顶部显示保存/授权状态并提供回到报告页查看二维码的入口。

首页已发布飞书报告卡片用真实链接直接打开文档，单独“AI会话”按钮进入原会话；未发布卡片进入本地报告和错误/授权状态。历史原任务、原手动上传行为、CLI 适配器均保留。报告归档后尚未派发上传就重启时补交保存；正在上传时重启则标为可重试失败，避免重复自动执行。

新增接口：GET /api/feishu-settings、PUT /api/feishu-settings，仅接受 rootName（1–100 字，去首尾空白，禁止控制字符），延续本机访问与跨站写入限制。

## 验收脚本

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

新增覆盖：目录默认值、非法值、重启持久化、跨站拒绝、任务目录快照、自动上传仅一次、等待报告轮次结束、授权后原会话续传、上传失败重试、归档重启补交、历史手动任务不自动提交、目录设置及 Prompt 联动、飞书卡片/AI入口分离。

真实 DSH 隔离宿主使用本机模拟模型与飞书交付回执，验证实际 Session Controller、原生对话、自动保存指令、二维码、授权回复、链接展示和返回。未调用外部付费模型，未实际创建飞书文件夹/文档；目录查找/创建策略由 Agent 按真实 CLI 指引执行，验收检查生成的指令。Windows 未做实机验证。

验收结果：80 项 Node 测试、18 项 Chromium 用例、真实 DSH 隔离宿主及发布包 Node/Electron/ZIP/离线安装检查通过。桌面和网页 profile 均已安装 0.11.0 并重启加载；既有桌面 8 条、网页 20 条任务记录保留。
