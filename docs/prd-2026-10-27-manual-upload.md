# PRD 修订 792 · 调研与上传飞书分开

来源：[调研工作台 PRD](https://zcnnosk3k1j9.feishu.cn/wiki/Twspww4ZKiUQI8krBGlc2VCsnmr)。通过本机 `lark-cli docs +fetch --as user` 读取，文档 ID 为 `EFBudIOLlopZPKxTpHtcSqgyn4d`，修订号 792。

## 新规则

默认 Prompt 调整为：

> 帮我在【数据源】进行【调研方向】的调研，整理成带数据来源的报告。

新增“上传飞书”流程：

> 报告生成后，可以点击【上传飞书】按钮启动agent保存到飞书，呈现飞书链接。
>
> 上传飞书文档工作交给终端的agent完成，平台本身不做飞书保存，（如果没有授权提供授权二维码给我）。

Codex 终端映射、默认完整访问、历史会话、失败保留等规则继续适用。

## 实现

1. 新建调研的 Prompt 和执行指引只要求生成报告。有效报告归档后进入待命，状态为 `not_requested`，不会自行上传或发起授权。
2. 报告详情及终端视图提供“上传飞书”。`POST /api/tasks/:id/publish` 只把用户要求转交终端 Agent，不调用飞书创建/写入 API。
3. 复用空闲的原 PTY，向 CLI 发送保存当前报告的后续指令。终端正在收尾时暂存指令，收尾后发送；正在处理其他要求时拒绝，避免打断用户。
4. 原终端退出时恢复真实 Session ID（旧记录缺失时使用任务目录内 resume --last）。由页面准备好后启动，并只传入上传指令，不重发原调研 Prompt、不新增调研执行记录。
5. Agent 使用平台导出的完整 Markdown 副本，保留摘要、正文和来源，使用本机 `lark-cli` 保存至飞书文档库。未授权时由 Agent 回传二维码和官方授权链接；用户在原终端继续授权。
6. 每次上传使用独立 requestId、指令文件、回执及二维码路径。连续点击同一上传不重复发送；旧 requestId、旧终端和未请求的回执不能覆盖当前状态。已发布报告重复点击不再发起保存。
7. 保存失败时保留报告并显示“重试上传飞书”。重试仍只交付已有报告；Agent 先检查历史文档/记录，避免创建不确定时重复建文档。
8. 服务重启不静默重放未完成上传；标记为可重试，保留已有报告及会话历史。

## 状态

`not_requested → publishing → published / awaiting_authorization / failed`

`awaiting_authorization` 下，用户在原终端确认授权，Agent 继续用同一 requestId 回传结果。`failed` 下点击重试产生新 requestId。`not_requested` 仍属于“报告已生成”，在已完成筛选中可见。

平台校验回执格式与链接域名，信任 Agent 对真实远端结果的回传，不独立验证文档内容。
