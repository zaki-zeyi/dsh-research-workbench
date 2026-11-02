# PRD 1939：根目录名字或文件夹链接二选一

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，2026-10-31 读取 revision 1939。版本 0.13.1。

本轮变化为“设置飞书根目录”明确选择根目录名字或飞书文件夹链接；其余会话、绑定、仅云端报告规则沿用 0.13.0。PRD 本轮没有新增飞书检索数据源，因此不扩展数据源选项。

设置弹窗提供“按名字创建”和“使用文件夹链接”两种方式，每次只显示所选输入。名字默认“调研工作台”，首次创建记住 ID；链接方式只填写有效飞书文件夹 URL，不要求名字、不重命名已有目录。提交只包含当前方式的字段，切回名字不夹带隐藏链接。重新打开或刷新根据已保存配置恢复选择。移动端布局与键盘操作保留。

PUT /api/feishu-settings 支持仅传 folderUrl，后端解析并保存 folderToken；rootName 内部兼容标签默认“调研工作台”，不用于重命名链接所指的文件夹。原有同时传 rootName/folderUrl 的调用继续兼容，链接决定实际目标。既有已完成或已固定目录的任务快照不迁移。

新建任务的前后端默认 Prompt 根据目标一致生成：名字方式显示根目录名字，链接方式明确显示指定文件夹链接；保存位置提示同步为“指定文件夹”。仍不需要目录列表读取或文档搜索权限，所有新报告仅保存飞书。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

93 项 Node 测试与 20 项 Chromium 用例通过。新增回归验证仅链接 API、准确 Prompt、方式切换清理隐藏字段、配置刷新恢复、历史任务不受影响，以及移动端布局。真实 DSH 隔离宿主采用本机模拟模型和飞书交付回执；本轮不再创建真实报告。Windows 本轮未进行实机宿主验证。

发布包离线安装、Node/Electron 与 ZIP 检查通过。桌面和网页版均已安装并重启加载 0.13.1，目标目录设置与历史任务数量核验保留。
