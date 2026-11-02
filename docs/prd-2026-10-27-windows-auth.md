# PRD 修订 945：Windows/macOS 与飞书授权二维码修复

来源：[PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-27 读取 revision 945。新增桌面 Windows/macOS 支持；同一轮用户补充“飞书没有授权时，没有提供二维码授权”。

## 飞书二维码问题

实际故障任务中，Agent 已生成 PNG，并写入 awaiting_authorization 回执。回执 expiresAt 为带 +08:00 的合法时间，原 zod datetime() 仅接受 UTC Z，监视器因此忽略整条回执，前端停在 publishing。

修复为 datetime({ offset: true })，继续校验官方授权 URL、requestId 和终端归属。上传指引明确必须写 awaiting_authorization 回执，PNG 文件名改用平台 basename，兼容 Windows 路径。图片尚未写入时前端最多自动重试 5 次，之后可手动刷新；二维码到期后提供“重新获取授权二维码”，原终端执行新的授权步骤，报告和调研执行记录不变。

本次实际任务已将原过期时间等价转换为 UTC，使正在运行的旧版服务识别授权回执。原链接到期后，沿用 Agent 已申请的 search:docs:read 权限，重新发起实际 split-flow、生成 PNG、更新原私有设备授权文件和原 requestId 的回执；未执行授权完成轮询、未代用户同意权限、未重新调研或保存文档。扫码后用户在原终端回复“已授权”，由原 Agent 继续完成授权和保存。授权链接和 device code 不写入发布包或文档。

## Windows/macOS 实现

- scripts/prepare-pty.mjs：Windows 准备架构匹配的 ConPTY DLL/OpenConsole 文件；macOS 修复 spawn-helper 可执行位。无安装时构建脚本。
- 打包依赖树改为提升共享依赖，版本冲突时才嵌套；从此前最长 343 字符的包内路径降低至不超过 180 字符，降低 Windows 解压风险。建议解压到较短目录，例如 C:\dsh-plugins。
- scripts/desktop-archive.mjs 使用 fflate 生成/解压 ZIP，不依赖 zip/unzip/tar 外部命令；保留 macOS helper 执行位。
- scripts/npm-command.mjs 在 Windows 使用 Node + npm-cli.js，避免直接 spawn npm.cmd。
- 同一个 0.4.0 tgz/ZIP 检查并包含 win32-x64、win32-arm64、darwin-x64、darwin-arm64 四种预编译终端文件。桌面仍通过“添加插件”弹窗输入解压目录安装。Windows 安装脚本引导使用桌面内置插件管理，不调用全局 CLI 修改 desktop profile。

安装说明：[plugin-install.md](plugin-install.md)。已安装旧版的用户需更新到 0.4.0 才能长期获得新校验及二维码刷新功能；当前旧版实例没有强制卸载，避免打断现有终端和桌面其他任务。

## 验收

- 50 项 Node 测试通过，新增 Windows exe/架构/参数边界、ConPTY 准备、npm 启动、中文目录 ZIP 和授权时间偏移用例。
- 12 项 Chromium 用例通过，新增 AC-UI-11：时区回执、二维码 404 后自动恢复；AC-UI-12：过期重新获取、requestId 更新、原 terminalId/报告/调研次数不变。
- 0.4.0 tgz/ZIP 在仓库外独立目录离线安装/解压，在本机 Node 与 DeepSeek Harness 0.2.1-rc.3 的 Electron 运行时分别通过页面、权限、服务复用、来源限制和真实 PTY 验收。
- .github/workflows/acceptance.yml 提供 windows-latest 和 macos-14 矩阵，运行完整验收、打包和发布包检查。当前仓库未推送，未触发该流程；Windows 真机与 Windows 桌面 GUI 尚未实测，不能把模拟分支测试称为 Windows 真机通过。

```bash
npm run acceptance
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

Windows 验收机可先运行完整仓库验收和 release-acceptance；桌面安装后也可用桌面附带的 Electron Node 运行时执行 scripts/plugin-acceptance.mjs --profile desktop，验证桌面实际安装目录与原生 PTY。
