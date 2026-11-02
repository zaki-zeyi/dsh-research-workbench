# PRD 2036：扫码登录账号并选择或创建应用

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)，revision 2036。插件版本 0.17.0。

## 使用流程

点击“扫码登录并选择应用”，在飞书官方页面先登录目标账号，再选择可管理的已有应用或创建新应用并确认。已绑定用户点击“重新绑定 / 更换应用”执行相同流程，避免换账号后继续授权 Codex mac 等旧应用。

应用绑定完成后自动继续个人文档授权，请使用同一账号。报告仍以个人身份保存：PRD 没有明确改为应用身份上传。本次支持扫码选择或创建应用，不承诺一次扫码同时完成应用配置和个人 OAuth。

## 实现

采用官方 @larksuiteoapi/node-sdk 1.76.0 registerApp，不指定旧 appId，不设置 createOnly，保留选择已有应用能力。使用最小模板，仅申请当前交付所需的用户文档和文件夹权限，不申请目录列表或搜索权限。

二维码地址仅允许官方 open.feishu.cn / open.larksuite.com 的 /page/cli 或 /page/launcher。Lark CLI 生成 PNG，支持轮询、刷新、过期、拒绝和取消。旧二维码刷新后失效，取消或迟到结果不改变原绑定。

Secret 只经内存及 CLI stdin 交给独立随机 profile 保存，不回显、不写进 SQLite、Prompt、日志。不修改 CLI 默认应用。CLI 保存成功后才选择新应用。保存扫码用户 open_id 作为账号约束，后续个人 OAuth 的 openId 不一致时拒绝绑定，要求重新扫码绑定对应账号的应用。

扫码期间禁止新建调研和切换配置，保存凭据期间禁止取消或刷新；任务执行期间禁止开始更换应用。历史任务保留原应用快照、原生会话和报告链接。

## 接口

- POST /api/feishu-registration：开始或复用流程，refresh=true 刷新。
- GET /api/feishu-registration：状态、公开验证链接、flowId、有效期、应用 ID 或清理后的错误。
- GET /api/feishu-registration/qr/:id：未过期待扫码流程的 PNG，no-store。
- DELETE /api/feishu-registration：取消待扫码流程，保留原配置。

接口保留 localhost Host/Origin 限制，不返回 Secret、device_code、用户 token 或扫码用户 ID。企业管理员审批仍由飞书控制；若远端已创建应用而本机保存失败，提示重试时选择该已有应用，不声称回滚远端应用。

## 验收

109 项 Node、26 项 Chromium 用例覆盖扫码注册到个人授权、账号一致性、无默认应用、凭据隔离、取消/过期/拒绝/迟到结果、保存期互斥、跨站和执行中限制，以及历史会话和云端报告。隔离真实 DSH 宿主以本机模拟模型验证任务交付。

npm run test:feishu-qr 实际请求官方验证二维码并生成 PNG，随后取消，不扫码、不创建应用、不保存或改变真实凭据。已实测兼容新版 /page/launcher 地址。自动测试使用模拟的应用创建确认；真实应用选择、创建和个人授权需用户在飞书中完成。

发布包验收包含离线依赖、官方 SDK、桌面 ZIP、Node/Electron 加载。

## 安装后核验

网页版 research-workbench profile 与桌面版 desktop profile 均已更新至 0.17.0 并重启。两端分别保留 21 条和 14 条历史记录，原应用及个人授权保持有效。安装后的两个运行时均实测生成了官方应用绑定 PNG，随后取消；未扫码、未创建应用、未切换账号或改动原配置。桌面绑定窗口已实查显示新的登录账号、选择/创建应用及个人授权引导。
