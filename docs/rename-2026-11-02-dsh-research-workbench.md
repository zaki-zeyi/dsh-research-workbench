# 0.18.0：统一名称为 dsh-research-workbench

GitHub 项目、npm 插件包名、DSH bundle/module ID、侧栏入口、页面标题、页面名称与安装包前缀统一为 dsh-research-workbench。

仓库：https://github.com/zaki-zeyi/dsh-research-workbench

## 升级

安装脚本先安装新名称的包，成功后移除旧 research-workbench 依赖和 bundle，避免重复入口。网页和桌面分别更新到 0.18.0。

为保留历史，现有 research-workbench 网页 profile、默认 ~/.dsh/research-workbench 数据目录、内部健康标识、消息协议与 HTTP 路由保留兼容。用户设置的飞书根目录名字不随项目改名而改变。源代码所在的本机文件夹不搬迁，避免使已安装插件与会话的路径失效。

## 验收

沿用完整 Node、浏览器、隔离真实 DSH 宿主和离线发布包检查。浏览器用例核验新标题的移动端布局，宿主用例使用新包名和新侧栏入口创建原生会话并交付报告。安装后核验每个 profile 仅包含新名称插件，并确认历史记录与个人授权保留。

安装后已实查：网页和桌面 profile 只保留 dsh-research-workbench bundle，旧包依赖已移除。两端页面均显示新名称；网页 21 条、桌面 17 条记录保留，数据库标识、记录 ID 集合和飞书绑定与升级前一致。113 项 Node、26 项浏览器交互、真实宿主以及 Node/Electron 离线包验收通过。
