# PRD 1951：飞书账号重新绑定

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-31 读取 revision 1951。版本 0.14.0。

新增“重新绑定”：首页打开“已绑定飞书”弹窗后，显示当前账号、“重新绑定”和“完成”。点击重新绑定即使已登录也发起新的 Device Flow，显示二维码与完整官方授权链接；用户可扫码切换账号，点击“我已授权”后由后端完成并核验，再更新账号展示。发起、取消或生成失败不会调用 logout；已有报告、任务和会话不迁移、不重建。

POST /api/feishu-binding 新增可选布尔 rebind。普通调用沿用已有绑定或当前有效流程；rebind=true 绕过已绑定的短路判断、清理原二维码，重新发起流程。输入严格校验，不能传入 device code 或其他字段。仍沿用本机访问和跨站写入限制。

“重新获取二维码”同样请求新流程，原 flowId 的二维码和确认接口失效，避免复用旧 Device Flow。相同模式的并发发起合并为一次请求；相互冲突的发起模式或正在确认授权时的重新绑定返回 409，不覆盖正在完成的流程。前端忙碌时禁用相关按钮，初次状态读取的迟到结果不能覆盖用户刚生成的二维码。凭据、device code 继续仅由后端/本机 CLI 管理，不进入 API 或前端。

绑定不新增目录列表读取或搜索权限。根目录名字/链接二选一、ID 复用、标准原生会话、仅飞书报告规则继续保留。切换账号不自动移动云端文件，用户可在根目录配置中指定新账号可访问的目标文件夹。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

96 项 Node 测试、21 项 Chromium 用例通过。新增覆盖：已绑定重新生成二维码、重复请求幂等、新旧流程失效、取消/生成失败保留原账号、确认中不替换流程、接口字段与跨站校验、模拟新账号确认后状态更新、历史报告和会话不变。真实隔离 DSH 宿主仍以本机模拟模型及飞书回执验证；本轮账号切换使用模拟账号，没有实际更换用户的飞书登录，也不创建真实报告。Windows 本轮未做实机宿主验证。

发布结果：离线包、Node/Electron 与 ZIP 检查通过。桌面和网页版已安装并重启加载 0.14.0；重载后核对当前真实账号、根目录设置和历史任务数量均保留。
