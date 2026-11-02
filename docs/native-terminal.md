# 历史终端兼容层

历史任务仍保留 node-pty → WebSocket → xterm.js 的回放与输入链路，升级不删除已有记录。该路径不是当前插件新任务的对话入口；新任务直接挂载 DSH 原生 Session。旧独立执行器的安装、登录与模型说明已撤下。

当前实现以 [技术架构](architecture.md) 和 [安装说明](plugin-install.md) 为准。此页保留用于已有文档链接兼容，不再指导安装旧执行器。
