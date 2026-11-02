# dsh-research-workbench 安装说明

插件在 DeepSeek Harness 桌面版和网页版中运行，界面显示「调研工作台」，AI 对话使用 DSH 原生会话。

## GitHub 直接安装

在 DSH“添加插件”弹窗中填写：

```text
https://github.com/zaki-zeyi/dsh-research-workbench
```

默认 `release` 分支已包含预构建页面与生产运行依赖，不要求安装时执行构建脚本。无需分支后缀或额外 AI 命令行。仓库目前为私有，安装账号需要有 GitHub 读取权限。安装完成后按宿主提示启用或重启，再点击侧栏「调研工作台」。

## 本地 ZIP / tgz 安装

离线安装可使用开发者生成的版本化 `dsh-research-workbench-<version>-desktop.zip`：

1. 解压至准备长期保留的位置。
2. 在“添加插件”中填写解压后目录的绝对路径。目录下应直接包含 package.json、plugin、server、dist、node_modules。
3. 安装并按提示重启或启用。不要填 ZIP 文件路径，也不要只填包名：目前未发布到 npm。

macOS 和 Windows 使用同一 ZIP，支持包内 darwin / win32 的 x64、arm64 预编译兼容模块。建议 Windows 选择较短目录，例如 `C:\dsh-plugins\dsh-research-workbench`。本地目录安装可能保存目录引用，安装后不要移动或删除该目录。

桌面版运行中应使用内置插件页面管理，避免用另一版本的全局 CLI 修改 desktop profile。完全退出 macOS 桌面应用后，也可通过内置 CLI 安装 tgz：

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add "/绝对路径/dsh-research-workbench-<version>.tgz"
```

网页版可通过其使用的 DSH CLI 安装：

```bash
dsh plugin --profile research-workbench add https://github.com/zaki-zeyi/dsh-research-workbench
dsh --profile research-workbench --no-open --port 3090
```

前提是该 profile 已存在并具有所需宿主插件。首次初始化请遵循所用 DSH 版本的模板指引。访问时使用 DSH 启动日志打印的完整认证链接，仅打开裸端口可能提示需要认证；该链接属于本机访问凭据，不应公开分享。

## 飞书与模型准备

新任务使用 DSH 的模型和工具配置；在宿主完成模型设置后即可使用，不需要在工作台再次填写模型 Key。

在运行 DSH 的环境中安装 Lark CLI。工作台点击“扫码登录并选择应用”，登录目标飞书账号，选择可管理的应用或创建应用，再按界面引导完成同账号个人文档授权。此流程仍以个人身份保存报告，不能绕过飞书企业管理员审批。

可提供已有飞书文件夹链接；未提供时首次创建默认目录并缓存 ID。新流程不要求目录列表读取或文档搜索权限。应用配置与个人授权分别校验，只有授权有效才能新建或重试调研。

## 数据与升级

插件默认数据目录为 `~/.dsh/research-workbench`，可以通过插件 `dataDir` 配置覆盖。桌面版和网页版若使用不同数据库，各自保留独立历史。升级包不包含本机 token、Secret、数据库或报告，也不会自动清理历史数据。

界面路由与存储目录保留原命名空间以兼容旧记录。完整技术说明见 [架构文档](https://github.com/zaki-zeyi/dsh-research-workbench/blob/release/docs/architecture.md)。

## 从源码构建与发布

源码位于 main 分支，需要 Node.js ≥22.13：

```bash
npm ci
npm run acceptance
npm run plugin:pack
npm run plugin:publish-git -- --output /新的临时发布目录 --push
```

`plugin:pack` 生成版本化 tgz、桌面 ZIP、SHA256 及发布元信息；`plugin:publish-git` 追加更新默认 release 分支。请勿将本机业务数据或凭据提交到仓库。

Git 直链冷缓存验收：

```bash
npm run test:git-install -- --pnpm-cli /DSH内置pnpm.mjs路径
```

该验收使用独立空 store，不增加 allowBuilds 或降低宿主策略。运行时功能测试、隔离宿主测试与真实扫码各有边界，参见仓库验收文档。
