# 验收用例

当前架构及使用入口见 [技术架构](architecture.md) 和 [安装说明](plugin-install.md)。以下覆盖新 DSH 原生流程及保留的历史兼容层，不把旧独立执行器作为用户安装前置条件。

| 范围 | 主要用例 | 入口 |
| --- | --- | --- |
| 任务编排 | 授权前置、幂等创建、串行队列、取消、失败重试与重启恢复 | `tests/service.test.mjs`、`tests/restart.test.mjs` |
| API | 参数校验、分页、状态、错误响应与 SSE | `tests/api.test.mjs` |
| 原生会话 | standard 预设、权限、Prompt、轮次结束、恢复、原会话交付与取消 | `tests/native-sessions.test.mjs` |
| 飞书云端交付 | 不归档新报告正文、固定 profile、目录与请求一致性、失败及重试 | `tests/cloud-research.test.mjs` |
| 目录设置 | 根目录名、链接解析、目录 ID 缓存、创建不确定时防重复 | `tests/feishu-settings.test.mjs` |
| 飞书个人授权 | 权限核验、二维码、完成、过期、失败、账号一致性 | `tests/feishu-binding.test.mjs` |
| 应用选择 | 应用凭据隔离、默认配置保护、执行中互斥 | `tests/feishu-application.test.mjs`、`tests/feishu-rebind-api.test.mjs` |
| 扫码应用流程 | 已有 / 新建应用、取消、过期、迟到结果、Secret 不回显 | `tests/feishu-registration.test.mjs` |
| 宿主嵌入 | 本机来源、消息来源、会话引用释放、过期打开请求、启动超时 | `tests/host-origin.test.mjs`、`tests/plugin-startup.test.mjs` |
| 插件生命周期 | 启动、卸载、同库复用、不同库拒绝、数据目录锁 | `tests/plugin.test.mjs` |
| 发布安装 | 入口和资源存在、无自动构建钩子、ZIP 与原生依赖、空 store Git 安装 | `tests/git-install.test.mjs`、`tests/platform.test.mjs` |
| 页面业务 | 任务列表、原生会话、飞书绑定 / 目录设置、错误恢复 | `tests/e2e` |

完整仓库验收：

```bash
npm run acceptance
```

独立检查：

```bash
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs
npm run test:git-install -- --pnpm-cli /DSH内置pnpm.mjs路径
```

授权、模型和云端写入的自动化主要使用隔离夹具。真实账号扫码、企业审批、实际模型检索质量和远端文档内容须另行人工核对，不由夹具测试替代。历史兼容模块的测试继续保留，升级不删除已有任务数据。
