# PRD 修订 833：dsh 插件安装与运行

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-27 读取，修订号 833。

新增原文：“基于dsh插件来实现，可以在dsh上安装本插件s”。本次将现有工作台封装成可安装的 dsh 双端插件。手动上传、原生 Codex 终端、完整访问、轮次结束后等待追问的业务规则沿用修订 792。

## 安装

前提：Node >=22.13、dsh、pnpm、Codex CLI 已安装，Codex 已登录。

```bash
npm ci
npm run plugin:install
```

安装器构建页面，生成 `artifacts/research-workbench-0.2.1.tgz`，通过 `dsh plugin --profile research-workbench add <绝对包路径>` 安装。首次创建 profile 时采用官方 web 模板。pnpm 只允许 node-pty 的构建脚本，项目包本身没有安装脚本；macOS spawn-helper 权限修复在终端模块加载时执行。

安装器另生成本机覆盖文件 `artifacts/dsh-research-workbench.yml`，指向项目现有 data 目录，保留 CODEX_MODEL 选择，不包含 token，也不复制 .env 到插件包。按安装器打印的命令启动，例如：

```bash
dsh --profile research-workbench --patch "$PWD/artifacts/dsh-research-workbench.yml" --no-open --port 3090
```

首次进入须使用 dsh 打印的本机认证链接。侧栏点击“调研工作台”。独立访问 `http://127.0.0.1:3088/` 仍可用。

分发只需 tgz。其他机器可运行：

```bash
dsh --profile research-workbench --from-default-profile web --help
dsh plugin --profile research-workbench add /绝对路径/research-workbench-0.2.1.tgz --allow-build node-pty
dsh --profile research-workbench --no-open --port 3090
```

已有 profile 不要重复使用 `--from-default-profile`。无覆盖配置时，数据默认保存在 `~/.dsh/research-workbench`，调研服务默认端口 3088。可用 `--patch` 对 research-workbench 行配置 dataDir、port、mode、model、command。仅支持本机浏览器使用。

## 实现

- `package.json` 声明 `dsh.bundle.patch`、`dsh.client` 和双端 exports；bundle 插入 research-workbench 插件行。
- host 端注入 webServer，注册状态路由，启动调研运行时，卸载时关闭自己拥有的服务。
- client 使用 dsh 官方模块加载协议，注册 `sidebar.panellist` 和相同 key 的 `main`，将现有界面挂到主面板。
- iframe 隔离工作台 React 19 与宿主 React 18；界面仍通过原来的 API、SSE 和 WebSocket 连接本机服务，Codex 继续使用原生 PTY。`?embed=dsh` 隐藏工作台自己的侧栏。
- `server/runtime.mjs` 同时供独立入口和插件使用。健康检查包含服务标识及数据目录指纹；同端口同数据库才复用。复用者卸载不会关闭原服务。
- 数据目录排他锁阻止不同端口重复打开同一数据库。端口占用或初始化失败会释放资源；崩溃留下的锁在确认进程不存在后清理。旧版本无身份标识的服务需要先退出再运行新版。

## 验收

```bash
npm run acceptance
node scripts/plugin-acceptance.mjs
```

2026-10-27：41 项 Node 测试、9 项 Chromium 用例通过。新增自动用例覆盖插件启动/卸载、初始化期间卸载、同库复用、其他库拒绝连接、数据库互斥、重启、侧栏与主面板映射和嵌入式布局。

安装包验收脚本直接从 dsh profile 的 node_modules 加载插件，使用临时数据库检查页面、服务复用、完整访问参数、来源限制和已安装的原生 node-pty；不调用真实模型。

本机真实安装与 UI 验证：dsh **0.1.5-rc.2**、pnpm **12.4.2**；真实侧栏入口出现，主面板展示现有 13 条历史调研。未对其他 dsh 版本宣称兼容，也未为本次架构验收发起付费模型调研或真实飞书上传；这些业务链路使用已有 PTY/回执夹具回归。

官方接口依据：[插件开发](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md)、[插槽契约](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/slots.md)，并与本机已安装版本的导出和调用点核对。
