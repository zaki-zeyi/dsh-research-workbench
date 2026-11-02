# PRD 修订 884：桌面版“添加插件”弹窗安装

2026-10-27 读取 [PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，revision 884。新增“其中桌面端可以通过以下添加插件的按钮和弹窗”，配图指定输入插件包名、GitHub 地址或本地目录路径。

## 实现

沿用 859 的 host/client 插件及业务逻辑；新增 0.3.1 本地目录交付方式：

- `artifacts/research-workbench-0.3.1/` 是完整可安装目录，根目录含 package.json、plugin、server、dist、node_modules。
- `artifacts/research-workbench-0.3.1-desktop.zip` 是便于分发的压缩包，解压后在桌面添加插件弹窗填写目录绝对路径。
- tgz 继续用于 CLI 安装；发布清单新增 directory、zipFilename、zipSha256，修订号更新为 884。ZIP 与 tgz 都附 SHA256 文件。
- `desktop-install-path.txt` 给出本机可粘贴的整行路径。
- 未发布到 npm，不应在弹窗中仅输入 research-workbench 包名。默认安装源可保留“npm 官方源”，本地包包含完整依赖，不要求安装时编译。

构建命令：`npm run plugin:pack`。目录从最终 tgz 解包生成，确保两种交付内容一致。保留解压目录，避免本地安装引用因移动目录而失效。

## 自动验收

```bash
npm test
npm run test:e2e
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

42 项 Node 测试通过；发布验收新增 ZIP 的 SHA256、解压目录结构及仓库外独立目录运行测试。ZIP 解压目录与 tgz 离线安装目录分别由普通 Node 和本机桌面 0.2.1-rc.3 的 Electron 运行时加载，页面、完整访问参数、同库服务复用、Origin 限制及真实 PTY 均通过。

## 桌面 GUI 实测

通过当前桌面版原生“添加插件”弹窗粘贴本地目录路径，点击“安装”。界面实际显示“已安装”、research-workbench、版本 0.3.1；点击“立即启用”后，插件开关为 on，左侧出现“调研工作台”入口。不修改其他插件，不退出桌面应用，不发起模型调研或飞书写入。

默认数据目录为 ~/.dsh/research-workbench（或 DSH_HOME 下对应目录），开发工作台的历史记录仍在原 data 目录。需要共用旧数据时使用 [安装说明](plugin-install.md) 中的可选配置。
