# GitHub 仓库直链安装修复

DSH 添加插件直接填写 `https://github.com/zaki-zeyi/dsh-research-workbench`，无需分支后缀。

此前安装失败分为两个阶段：源码包触发 Git 准备脚本限制；移除根生命周期钩子后，依赖树中的原生构建又被严格策略拒绝。最终方案为自包含发布包，携带预构建界面、生产依赖和匹配平台的终端预编译文件，不放宽 allowBuilds。

仓库默认分支为 `release`，开发源码保留在 `main`。发布脚本从正式打包结果生成 release，并通过普通追加提交发布。旧的带分支后缀链接不再作为安装入口。

已使用完整仓库直链、独立空 pnpm store 和 DSH 内置 pnpm 11.28.5 验证安装；Node 与桌面 Electron 的页面、服务复用、权限、来源限制和原生终端检查通过。仓库为私有，其他环境仍需要 GitHub 读取权限。

完整发布流程见 [技术架构](architecture.md)，用户安装见 [安装说明](plugin-install.md)。
