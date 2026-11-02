# PRD 1956：配置自己的飞书应用

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-11-01 读取 revision 1956。版本 0.15.0。

## 使用流程

首页进入“绑定飞书 / 已绑定飞书”，点击“配置自己的飞书应用”，填写 App ID 与 App Secret，保存后扫码绑定该应用下的用户账号。应用应属于目标账号可使用的企业，具备文档创建、编辑、读取以及文件夹创建等权限。跨企业切换后应确认目标文件夹对新账号可访问。

支持切回“使用本机默认应用”。已有自定义应用重新打开时密钥为空；同一 App ID 可留空保留已存凭据。更换 App ID 必须提供 Secret。取消不改变配置，配置失败保留原应用。正在调研/上传或处理授权时拒绝切换。

## 凭据和应用隔离

使用 lark-cli profile add --name <独立随机profile> --app-id <id> --app-secret-stdin --brand feishu。Secret 只通过子进程 stdin 传入，凭据交给 Lark CLI 安全存储，工作台 SQLite 只保存 mode/App ID/profile；不把密钥放命令行参数、日志、前端回读、任务 Prompt 或发布包。不执行 profile use、logout 或删除原配置。

自定义应用的授权状态、二维码、Device Flow 确认均显式携带 --profile；CLI 返回应用 ID 不匹配时失败，不回退默认应用。Agent 的所有飞书命令同样固定该 profile，任务保存所选应用快照。用户原始调研 Prompt 不因命令前缀替换而改变。

不同应用的自动目录缓存隔离。明确提供的文件夹链接保持用户设置，不自动迁移文件。已完成任务和会话保留原应用快照；失败任务在用户重试时采用当前已授权应用、复用原会话，旧执行记录保存原配置。这样可以用新应用恢复之前因旧应用无使用权限而失败的交付。

## 接口

- GET /api/feishu-application：当前应用来源、App ID、hasSecret；不返回 Secret。
- PUT /api/feishu-application：{mode:'custom',appId,appSecret?} 或 {mode:'default'}。严格字段校验、沿用本机及跨站限制，忙碌返回 409。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

101 项 Node、22 项 Chromium 用例通过。覆盖 stdin 传密钥、无数据库/接口泄露、无默认应用切换、配置失败回滚、留空保留凭据、profile 授权和指令隔离、应用 ID 不匹配拒绝、目录缓存隔离、失败任务改用新应用重试、恢复默认、字段/跨站/忙碌校验，以及完整前端配置→扫码→新应用原生调研。

真实 DSH 隔离宿主也通过应用配置接口配置测试应用，再经独立 CLI profile 创建原生 Session、生成云端回执并验证消息输入/返回。模型、CLI 凭据与飞书交付使用本机模拟，不配置真实 App Secret、不修改用户当前真实应用或账号、不创建真实报告。Windows 本轮未做实机宿主验证。

发布结果：离线包、Node/Electron 和 ZIP 验证通过；桌面及网页版均已安装并重启加载 0.15.0。重载后核验仍使用原默认应用和原账号，根目录及历史任务数量保留。真实自定义应用需由用户在配置表单中填写自己的凭据并扫码，不在聊天中提交密钥。
