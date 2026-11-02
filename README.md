# dsh-research-workbench

适用于 DeepSeek Harness 桌面版和网页版的本地调研插件。包名为 `dsh-research-workbench`，界面名称为「调研工作台」。

工作台管理调研任务，复用 DSH 原生 AI 会话执行检索和追问，由 Agent 通过 Lark CLI 以个人身份把报告保存到飞书。首页展示任务状态与飞书链接，新流程不在工作台保存报告正文。

## 安装

在 DSH 的“添加插件”中直接填写：

```text
https://github.com/zaki-zeyi/dsh-research-workbench
```

仓库默认 `release` 分支包含预构建界面和生产运行依赖，无需分支后缀或额外 AI 命令行。仓库目前为私有，安装环境需要 GitHub 读取权限。安装完成后按宿主提示启用或重启，在侧栏打开「调研工作台」。

详见 [安装说明](docs/plugin-install.md)。开发源码位于 [main 分支](https://github.com/zaki-zeyi/dsh-research-workbench/tree/main)。

## 使用

1. 在运行 DSH 的环境中安装 Lark CLI。
2. 点击“绑定飞书 / 扫码登录并选择应用”，登录目标账号并选择可管理的已有应用，或创建应用。
3. 按界面引导完成同账号个人文档授权。应用绑定与个人授权分步核验，企业审批由飞书控制。
4. 设置已有飞书文件夹链接，或使用默认根目录；填写调研方向后开始调研。
5. 从首页打开飞书报告，或进入“AI会话”继续追问。失败后可复用原会话核对并重试。

新原生会话沿用 DSH 宿主的模型、工具和对话能力，无需在工作台重复配置模型密钥。目录流程直接使用已知目录 ID，或首次创建后缓存 ID，不要求云盘目录列表与文档搜索权限。

## 技术架构

React 工作台通过 iframe 嵌入宿主；Node.js / Express 负责本机接口与单任务队列，SQLite WAL 保存任务、Session 绑定及交付元信息。DSH SessionController 执行 Agent 任务，Lark CLI 写入飞书，平台校验 Agent 回执并通过 SSE 更新状态。

[完整技术架构](docs/architecture.md) 包含组件图、执行时序、授权流程、数据边界、接口清单、恢复机制和发布方式。

## 开发与验收

从 `main` 分支获取源码，使用 Node.js ≥22.13：

```bash
npm ci
npm run acceptance
npm run plugin:pack
```

实际原生调研需在 DSH 插件宿主中运行。离线界面演示可使用以下命令，演示不会进行真实调研或飞书写入：

```bash
npm run build
RESEARCH_MODE=demo npm start
```

演示地址为 [http://127.0.0.1:3088](http://127.0.0.1:3088)。

- [验收用例](docs/acceptance.md)
- [验收结果与边界](docs/acceptance-report.md)
- [扫码应用绑定实现](docs/prd-2026-11-02-qr-application.md)

系统面向本机单用户使用，保留本机 Host / Origin 限制。历史任务兼容模块仍存在，但不作为新原生任务的执行入口。升级不会自动删除已有历史数据。
