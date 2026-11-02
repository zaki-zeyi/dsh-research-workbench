# PRD 1915：文件夹链接与免目录列表授权

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-31 读取 revision 1915。版本 0.13.0。

## 实现

“设置飞书根目录”新增可选目标文件夹链接。只接受 HTTPS、飞书/Lark 官方域名下的 /drive/folder/<token>，拒绝文档、Wiki、外站、含凭据或非标准端口、编码路径穿越等链接。后端解析并持久化 folderToken，新任务固定其目标目录 ID。指定链接或已记住 ID 时，Agent 直接 docs +create --parent-token，不查询目录、不按名字搜索、不新建文件夹。无权限或目录失效时显示失败，不退回其他位置。

不填链接且工作台未记住该名字的目录时，首次创建根目录文件夹（默认“调研工作台”），创建后先回传状态和真实 folderToken，再保存正文。平台缓存目录 ID，后续任务与重试复用。因为不读取目录列表，无法按名字发现工作台之外已有的同名文件夹；界面提示这类情况需粘贴已有文件夹链接。

创建前持久化创建意图；创建结果未知时，其他任务不会盲目再次新建，需补充链接或由原会话核对。原任务重试优先从历史 CLI 结果恢复 ID，确认从未发出过创建请求才可首次创建。创建目录后写文档失败仍保存回传 ID。补充链接后，同名且尚无已知目标 ID 的失败/排队任务重试可采用该链接；已有明确 ID 的任务和已交付报告不会被修改或迁移。

目录元信息只保存 ID 与配置，不包含报告正文。交付回执新增可选 folderToken，云端新任务的 published 必须回传真实目录 ID。明确指定目录与回传 ID 不一致时拒绝成功状态。报告仍仅存飞书，工作台只提供 AI 会话和飞书卡片链接。

绑定不再要求或申请 space:document:retrieve、search:docs:read。已有有效文档写入/创建目录等权限即可使用，不需要继续之前的目录读取扫码流程。身份核验、缺失实际写入权限时的二维码、macOS QR 工作目录修复保留。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

覆盖链接校验、目录 ID 保存/刷新/任务快照、无目录读取/搜索 scope 仍绑定成功、授权不请求这两项、指定 ID 直接保存、默认首次创建后复用、目录创建不确定时不重复创建、补链接恢复、创建后失败仍保存 ID，以及错误目录回执不算成功。真实 DSH 隔离宿主使用本机模拟模型与飞书交付回执，检查真实 Session Controller、原生消息、追问、返回和仅云端报告。Windows 本轮没有实机宿主验证。

验收结果：92 项 Node、19 项 Chromium、真实 DSH 隔离宿主，以及离线安装和 Node/Electron/ZIP 发布检查通过。桌面和网页版均已安装、重启加载 0.13.0。

真实交付验证：恢复原“微纳核芯”失败任务，保持原 Session ID，创建并记住目标文件夹 ID，报告实际保存到飞书；再次通过 CLI 只读获取确认主题、正文和来源链接可读取（正文只在内存核验，未写本地）。SQLite 无 report/draft/reports 正文，任务目录无 report/upload-report 文件。网页版尚未指定目标的默认设置也复用这次已确认的文件夹，避免两端各建同名目录。
