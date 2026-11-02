# PRD 修订 1488：宿主原生会话与验收更新插件

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-29 读取 revision 1488。业务规则调整为“ai会话复用宿主dsh的原生会话”，删除配置AI行；新增每次新功能运行验收、修复错误增加用例、验收后更新插件。

## 实现

DSH 插件注入宿主 Session Controller、Permission Presets，使用 native 模式启动工作台后端。NativeSessions 在宿主创建或恢复 Session，只对新建的调研会话设置 danger-full-access，不修改全局默认权限。模型、工具、历史、输入、流式消息、工具执行及停止本轮由 DSH 原生会话提供；不启动外部 dsh tui 或 PTY，不覆盖宿主模型或凭据。

点击启动后，工作台绑定 taskId → 宿主 sessionId，打开 DSH 原生对话页。返回 DSH 侧栏“调研工作台”时默认展示刚才任务的报告；历史“AI对话”打开同一会话。使用公开的 uiWorkspace.openSession 导航，原生 UI 完整保留。工作台并未在 iframe 内复制一套 DSH 聊天组件。

跨 iframe 导航仅接受当前工作台 iframe 的确切来源及窗口；父窗口通过宿主 /research-workbench/session 读取任务绑定，忽略消息中任意传入的会话标识。返回时默认报告视图，避免自动跳转循环。

Agent 通过任务文件收到调研要求，写入结构化报告；后端验证、保存版本并保留本地副本。本轮结束无报告或原生错误会立即显示失败；重试复用宿主会话并换用新的报告文件，旧草稿与记录保留。轮次完成后等待新要求，不关闭宿主 Session。

飞书上传仍由用户点击触发。指令进入同一宿主 Session，读取已有报告、执行授权与保存，再写入带 requestId 的回执。二维码、授权过期、上传链接继续使用已有协议。原生会话回复“已授权”即可继续保存，无需重复调研。平台不调用飞书写入 API。

旧 CLI 任务仍走原终端恢复与重试适配，不因插件升级被改为新会话；独立 Node/3088 CLI 模式作为兼容入口保留。新需求需要在 DSH 插件宿主体验。独立入口不能伪装成拥有宿主原生会话。

## 接口

- GET /api/config 新增 nativeSessionAvailable，原生模式 transport=dsh-native。
- GET /api/tasks/:id/session 读取该任务的宿主 Session 绑定，不创建会话或发送消息。
- 宿主 GET /research-workbench/session?taskId=... 用于同源校验任务绑定后导航。
- 创建、取消、报告、手动上传、二维码、SSE 与历史接口继续复用。

## 验收和更新

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
npm run plugin:install -- --profile desktop
```

后续可以一次执行验收与插件更新：

```bash
npm run accept:update -- --profile desktop --host-smoke
```

验收失败会停止，不继续安装。

本轮 69 项 Node 测试和 15 项 Chromium 用例通过。新增覆盖：原生 Session 创建、默认模型沿用、完整权限、无 PTY、追问复用、原生错误与无报告失败、重试保留会话、授权二维码与同会话保存、导航来源校验、返回默认报告、旧 CLI 路由和插件重载不重复提交。

真实 DSH 宿主以隔离 DSH_HOME 和本机模拟模型运行：验证实际 Session Controller、权限服务、原生事件和报告回执，不调用外部付费模型或真实飞书写入。浏览器自动验收验证原生页面跳转与消息呈现。Windows 本轮未做实机宿主验证。
