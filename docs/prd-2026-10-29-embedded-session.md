# PRD 修订 1511：工作台内嵌宿主原生会话

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，读取 revision 1511。本次新增明确规则：“ai会话界面还是【调研工作台】，但是AI会话从dsh映射过来，复用宿主dsh的原生会话”。

## 行为

新建调研和点击历史“AI对话”时，主面板始终保持“调研工作台”。面包屑、任务标题、“全部调研”、“调研报告 / AI对话”、报告状态和上传入口保留；宿主原生消息区、工具展示和输入框在工作台内显示。报告与对话之间切换仍使用同一个宿主 Session，不额外创建会话或提交调研。

上传入口从内嵌对话返回该任务报告视图并触发手动上传，二维码和文档链接沿用现有展示。用户可在报告页点击 AI对话，回到同一内嵌会话继续授权和保存。停止当前轮次、追问、模型选择等能力由 DSH 原生组件提供。

## 实现

客户端通过公开 `sessions.retain(sessionId, {source: 'research-workbench'})` 获取会话引用，由 Slot 提供的 SessionProvider 显式绑定该引用，渲染 `conversation.content` Factory（variant=embedded）。不调用 uiWorkspace.openSession，不切换到宿主全局主会话页，不复制终端字符或另造一个 Agent。

父插件保留工作台 iframe 实例；对话视图显示原生 Factory，报告视图显示原 iframe。双方用确切 Origin、窗口来源、任务绑定和请求标识校验消息。父端通过宿主只读接口核对 taskId → sessionId 后才获得引用；主面板的状态、Agent 和模型不会由 iframe 自行指定。

切换报告、离开工作台或卸载插件会释放客户端引用，不取消宿主 Agent。已发出的加载使用版本号控制，离开页面时立即释放仍在加载的引用；迟到结果不得覆盖报告页。重新打开已有会话不会重新发送调研 Prompt。工作台iframe不因页签切换而重新加载。

后端 Session、报告文件、回执、二维码、SQLite、任务重试和旧 CLI 兼容逻辑继续复用。宿主绑定只读接口新增 direction、reportReady 和 status，供原生视图顶部展示。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

自动验收更新命令保持：

```bash
npm run accept:update -- --profile desktop --host-smoke
```

- Node：来源与任务绑定校验、保留工作台、报告切换释放引用、加载中离开后立即释放、忽略迟到结果、卸载不取消宿主 Agent。
- 页面：新建后内嵌对话，切换回报告，历史复用、授权二维码及文档链接，任务次数与报告版本不变。
- 真实 DSH：隔离宿主中验证实际 SessionProvider、conversation.content、原生消息与输入、发送追问、报告切换、上传入口及同会话授权继续保存；模型与飞书交付由本机测试夹具模拟，不调用外部付费模型或真实飞书写入。

本轮 71 项 Node 测试、15 项 Chromium 用例及真实 DSH 宿主内嵌对话验收通过。

版本 0.8.0，适用于桌面与网页版。Windows 实机宿主本轮未执行。
