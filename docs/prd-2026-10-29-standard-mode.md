# PRD 修订 1572：新调研默认标准模式

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，读取 revision 1572。新增“agent默认打开系统全部权限，默认使用标准模式”。

新建调研时显式调用宿主 Session Controller 的 `create({cwd, agentPreset:'standard'})`，随后对该新会话设置完整访问权限。即使宿主全局默认是其他模式，新调研也使用标准模式；不更改宿主全局默认、模型和其他会话。

创建结果返回的实际 agentPreset 保存在会话绑定元信息中。历史会话恢复、重试、追问和飞书上传继续复用原 Session，不重新创建或强制改回标准模式，保留用户在已有会话中的模式选择。工作台内嵌对话、统一风格、返回入口、报告及上传流程保持原规则。

## 验收

```bash
npm run acceptance
npm run test:native-host
npm run plugin:pack
node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
```

新增回归用例：宿主默认 cordis 时新调研仍明确采用 standard，并保留完整权限；用户将历史会话改为其他模式后，重试及追问不重置该选择。

真实 DSH 隔离验收把宿主默认刻意设为 cordis，检查实际创建返回并持久化的 agentPreset 为 standard，同时验证原生输入、报告、返回和上传流程。模型和飞书交付采用本机模拟接口，不发起外部付费调用或真实飞书写入。

本轮 76 项 Node 测试、16 项 Chromium 用例以及真实 DSH 隔离宿主验收通过。

版本 0.10.0。Windows 本轮未执行实机宿主验证。
