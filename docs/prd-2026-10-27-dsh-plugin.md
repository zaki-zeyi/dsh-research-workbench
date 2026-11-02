# DSH 插件接入说明

插件通过 Cordis patch 注册，宿主端注入 webServer、sessionController 与 permissionPresets，客户端注册侧栏和主面板。工作台通过 iframe 隔离前端依赖，AI 对话通过宿主原生 conversation.content 插槽呈现。旧版终端安装参数已撤下。

当前实现以 [技术架构](architecture.md) 和 [安装说明](plugin-install.md) 为准。此页保留用于已有文档链接兼容，不再指导安装旧执行器。
