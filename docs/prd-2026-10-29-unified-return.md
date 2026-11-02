# PRD 修订 1567：统一风格与返回工作台

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，本次读取 revision 1567。新增：报告和 AI 会话页签点击“返回”回到调研工作台；内嵌 AI 会话与工作台风格统一。

## 行为与实现

报告和原生对话两种视图都提供明确的“返回”按钮，目标为工作台首页，不依赖浏览器上一页。返回会刷新历史卡片列表；再次打开卡片默认报告视图，点击 AI对话继续绑定同一宿主 Session，不增加调研次数或报告版本。

两种视图共用 plugin/workbench-theme.css：字体、工作区背景、75px 页头、详情间距、标题、返回按钮、元信息、页签激活色及对话卡片采用同一套样式。iframe 的报告页将其编译进前端构建；宿主通过 /research-workbench/theme.css 提供同一文件给原生对话外壳，样式限制在 rw-workspace 范围，不影响 DSH 其他页面。

响应式布局依据工作区容器宽度，避免宿主与 iframe 视口宽度不同导致样式断点不一致。DSH 的原生消息、工具、输入框及会话控制继续复用，工作台保留自身导航和上传入口。

宿主 Session 绑定只读接口增加创建时间、来源与调研次数，供对话页显示与报告页一致的元信息。返回仅释放客户端引用并恢复已有 iframe，不取消 Agent、不重新加载 iframe、不重新调研。既有报告和历史数据不迁移、不删除。

## 验收与发布

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

- 新增 Node 回归用例：对话页“返回”向首页导航，释放引用，保留宿主会话与 iframe。
- 新增 AC-UI-15：报告与 AI 对话的返回入口都能回首页，重新打开后任务次数、报告保持不变。
- 真实 DSH 验收：两视图返回首页、历史重新打开、消息追问与同会话上传继续有效；比较两视图的标题字号、字体、页签、详情留白、背景等浏览器计算样式，确保使用一致主题。

74 项 Node 测试、16 项 Chromium 用例通过；真实 DSH 使用本机模拟模型及飞书回执验证，不调用外部付费模型或真实写入飞书。发布版本 0.9.1，通用 tgz 和桌面 ZIP 继续支持原有安装流程。Windows 本轮未执行实机宿主验证。

## 桌面协议兼容性回归

桌面版 dsh-app://app 嵌入本地 HTTP 页面时可能不提供 Referer。父插件在 iframe 地址中显式传入宿主来源；子页面仅接受本机 HTTP(S) 或确切 dsh-app://app 来源，消息仍校验父窗口与 Origin。补充无 Referer 页面端到端用例及无效来源拒绝用例，避免对话入口提示无法确认宿主来源。

桌面实机复核：0.9.1 在 dsh-app://app 中成功载入原生输入框，报告与内嵌对话均显示返回按钮，对话返回工作台首页后原有6条桌面记录保留；网页版20条历史记录保留。
