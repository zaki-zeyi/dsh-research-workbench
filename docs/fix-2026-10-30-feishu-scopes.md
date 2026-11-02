# 飞书已绑定但无法上传（0.12.2）

用户反馈：工作台显示已绑定，Agent 列举目标目录时返回 missing_scope:space:document:retrieve，搜索目录时返回 missing_scope:search:docs:read。

根因：0.12.0 绑定检查只核验了登录和部分文档/云盘权限，遗漏上述两项，导致前置检查通过但真实目录查询失败。本机只读核验确认这两项确实未授权；本机 CLI 的 drive.files.list schema 也列出 space:document:retrieve 为可用授权项。

修复：requiredScopes 补齐目录读取和文档搜索，缺少任意一项不显示已绑定、不允许新建/重试；状态区分“已登录”和“可执行完整保存流程”，提供 missingScopes 元信息及明确补授权提示。首页显示“补充飞书授权”，弹窗通过已有 split Device Flow 发起增量授权，扫码后点“我已授权”，完成后再次核验。登录凭据仍由本机 lark-cli 管理，不注销现有用户、不显示 device code/token。

首页定时/窗口重新聚焦时刷新状态；打开绑定弹窗时同步刷新首页提示，避免沿用旧的“已绑定”状态。授权后恢复失败任务时，指令要求优先复用原会话已完成资料，仅补交飞书，先查重已有文档，不默认重新调研。

新增回归：固定旧版权限列表（独立于动态 requiredScopes），逐一缺少目录/搜索权限时拒绝；补授权请求包含真实缺失权限，完成后才显示绑定成功。浏览器从“已登录但旧权限”的状态出发，确认首页/弹窗补授权、二维码、确认后新建与云端交付闭环。既有云端失败重试用例新增验证复用资料的指令。

验证命令：npm run acceptance、npm run test:native-host、npm run plugin:pack、node scripts/release-acceptance.mjs --desktop-runtime "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"。

真实补授权需用户在飞书扫码确认；模拟回归通过不能等同真实用户已经获得新增权限。未获授权前不会自动重试或宣称上传成功。

真实补授权验证发现并修复 macOS 临时目录问题：lark-cli 限制二维码输出在 cwd、/tmp 或 ~/files 范围，系统 temp 可能落到 /var/folders。生成二维码时显式指定该临时目录为子进程 cwd，绝对输出路径位于允许根目录内；未放宽 CLI 文件访问限制。新增对应回归，并已用真实 CLI 验证官方授权流程与 PNG 生成（未完成用户授权）。

最终验收：87 项 Node、18 项浏览器用例、真实 DSH 隔离宿主、离线安装和桌面 Node/Electron/ZIP 验证通过。桌面与网页已安装并重启加载 0.12.2。真实官方二维码已生成并可通过绑定 API 读取；当前缺失权限仍需用户扫码确认，尚未完成真实上传。
