# 0.18.2 GitHub 链接安装

原始仓库链接指向 main 开发源码。根包的 prepack 加上未声明 main，使 DSH 内置 pnpm 尝试准备 Git 依赖，触发 ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED。只修入口仍不够：冷缓存下 node-pty 与 protobufjs 的安装脚本会触发 ERR_PNPM_IGNORED_BUILDS。

## 安装入口

请在 DSH 添加插件弹窗中使用：

```
https://github.com/zaki-zeyi/dsh-research-workbench#codex/install
```

codex/install 是正式安装分支，内容与已验收的 tgz/ZIP 发布包相同，包含预构建前端及全部生产运行依赖，根 manifest 无生命周期脚本和开发依赖。main 保留开发源码，补充 main 入口并提交 dist，移除自动 prepack，将检查改为显式 plugin:check-pack 命令。

不增加 allowBuilds，不执行 pnpm approve-builds，不关闭 strictDepBuilds。安装分支携带经过现有离线包验收的预编译 PTY 文件。仓库仍为私有，使用者需要相应 GitHub 读取权限。

## 发布与验收

先执行 plugin:pack，再运行 plugin:publish-git -- --output <新的临时目录> --push。脚本在独立目录生成 codex/install，后续发布基于已有安装分支正常追加提交，不改变 main 默认分支，不覆盖源码历史。

新增 test:git-install 脚本，用 DSH 实际内置 pnpm.mjs，在全新目录和空 store 中安装 Git 依赖，再用 Node 和 Electron 验证页面、依赖、运行时、权限边界与原生 PTY。支持 --source 指定本地安装分支 Git URL。

已验证本地分发 Git 版本冷安装通过：仅安装 1 个自包含插件包，无构建脚本授权。新增 2 项源码安装契约回归，总计 115 项 Node 用例。

远程安装分支已发布；通过完整 GitHub 分支链接在全新 store 中实际安装成功，Node/Electron 验收均通过。桌面 profile 也已用同一链接安装至 0.18.2，保留 17 条历史记录且飞书绑定有效。网页版同步遇到 GitHub 443 连接超时，改用相同版本的已验收本地 tgz 更新；该网络问题与此前的构建脚本限制不同。
