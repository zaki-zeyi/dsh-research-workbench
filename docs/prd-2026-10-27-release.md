# PRD 修订 859：桌面版与网页版安装包

来源：[PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-27 读取 revision 859。

新增：“基于dsh插件来实现，可以在dsh上安装本插件，独立的页签呈现【调研工作台】”；“发布方式：制作成包，可以安装到dsh的桌面版和网页版”。

## 交付

`artifacts/research-workbench-0.3.0.tgz`，约 17 MiB，适用于桌面和网页；配套 `.sha256` 与 `plugin-release.json`（版本、文件大小、校验和、PRD 修订号）。[安装说明](plugin-install.md) 同时放在包内 README。

```bash
npm run plugin:pack
```

打包器只复制 host/client 插件、业务服务、生产前端、终端通知及修复脚本、安装说明，并递归打包后端所需完整生产依赖，包含第三方许可证。发布包不包含项目 data、.env、账号、授权、测试数据、前端开发工具，不含安装脚本。验收完全离线安装，避免 pnpm 构建审批拦截。重新打包后生成新的 SHA256。

默认自动分配本机空闲端口，避免桌面安装时与开发服务器 3088 冲突。数据位于 `$DSH_HOME/research-workbench`，默认 `~/.dsh/research-workbench`；不依赖开发项目绝对路径。想继续使用开发目录的旧记录时，可显式设置 dataDir 和 port；同端口同库复用与排他锁仍生效。

host 注册状态接口并管理服务生命周期；client 注册同一 key 的侧栏入口及独立主面板。桌面 `dsh-app://app` 的请求由宿主协议处理器转发至 host，iframe 内部仍从本机 HTTP 服务加载，API/SSE/WebSocket 保持同源。

桌面安装器识别 `--profile desktop`，在 macOS 使用应用附带的 `runtime/cli/bin/dsh`，不再用全局旧版 CLI 修改桌面 profile。需先完全退出桌面应用。web profile 保持官方 CLI 安装方式。默认安装不必手改 YAML。

## 验收脚本与结果

```bash
npm run acceptance
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

- 42 项 Node 服务/插件/PTY 测试通过。
- 9 项 Chromium 界面验收通过，覆盖独立/嵌入模式、调研完成后等待输入、手动上传、授权二维码、重试。
- tgz 在仓库外的独立临时目录执行 `npm install --offline --ignore-scripts` 成功，无法回退使用项目 node_modules。
- 普通 Node 与本机 DeepSeek Harness 桌面版 **0.2.1-rc.3 的 Electron Node 运行时**分别从该目录加载插件，校验前端页面、完整访问配置、同库复用、Origin 限制和真实 node-pty 启动，均通过。
- SHA256 校验通过；脚本在 finally 清理临时目录，不修改桌面 profile 或现有会话。
- 实测 macOS Apple Silicon；未宣称已完成 Windows/Linux 或桌面 GUI 安装点击验收。本次未发起真实模型调研及飞书写入，业务流程沿用夹具回归。

旧修订 833 的浏览器 dsh 0.1.5-rc.2 已验证侧栏、主面板和历史列表；本次新增桌面运行时和独立安装包验证。

官方依据：[桌面 profile 与内置 CLI](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md)、[插件管理界面](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/README.md)，并核对本机 0.2.1-rc.3 应用中安装的协议处理器与插槽实现。
