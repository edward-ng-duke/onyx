# Onyx Web i18n Glossary

This file is the authoritative term reference for translating Onyx UI from English to Chinese (zh-CN). Every i18n wave must consult it before writing zh.json entries.

## Style rules

1. UI button labels stay ≤ 6 Chinese characters where possible.
2. One-line tooltips and toasts read as a single sentence with no trailing period.
3. Never machine-rephrase brand names — keep them in their original Latin spelling.

## Brand and concept words — keep in English

These words flow through Onyx's docs, admin UI, and product positioning. Translating them creates more confusion than clarity:

- Onyx
- Vespa
- SearXNG
- LiteLLM
- Postgres
- Redis
- MinIO
- Connector
- Persona
- Agent
- Embedding
- Reranker
- MCP
- API / API Base / API Key
- OAuth / SAML / OIDC
- LLM
- Token (when discussing LLM context tokens)
- JSON / YAML / CSV (formats)

When the surrounding sentence requires natural Chinese flow, you may add a short clarifier in parentheses on first occurrence (e.g. "Connector（数据连接器）"), but the bare term should remain English in subsequent occurrences in the same screen.

## Forced translations

These have a single canonical Chinese form. Don't invent variants.

| English | 中文 |
| --- | --- |
| LLM Provider | 大语言模型供应商 |
| Language Models | 语言模型 |
| API Base / API Base URL | API 接入地址 |
| API Key | API 密钥 |
| Document Set | 文档集 |
| Index Settings | 索引设置 |
| Search Settings | 搜索设置 |
| Web Search | 联网搜索 |
| Knowledge Graph | 知识图谱 |
| Document Processing | 文档处理 |
| Chat Preferences | 聊天偏好 |
| Existing Connectors | 已配置 Connector |
| Add Connector | 新增 Connector |
| Standard Answers | 标准回复 |
| Document Sets | 文档集 |
| Service Accounts | 服务账号 |
| Spending Limits | 费用上限 |
| Usage Statistics | 用量统计 |
| User Groups | 用户组 |
| Image Generation | 图像生成 |
| Code Interpreter | 代码解释器 |
| Voice | 语音 |

## Common actions and labels

UI button copy. Keep these consistent across every screen.

| English | 中文 |
| --- | --- |
| Save | 保存 |
| Cancel | 取消 |
| Delete | 删除 |
| Edit | 编辑 |
| Add | 新增 |
| Remove | 移除 |
| Submit | 提交 |
| Close | 关闭 |
| Confirm | 确认 |
| Apply | 应用 |
| Reset | 重置 |
| Refresh | 刷新 |
| Test | 测试 |
| Back | 返回 |
| Next | 下一步 |
| Create | 创建 |
| Search | 搜索 |
| Loading... | 加载中… |
| Saving... | 保存中… |
| Deleting... | 删除中… |
| Yes | 是 |
| No | 否 |
| Name | 名称 |
| Description | 描述 |
| Type | 类型 |
| Status | 状态 |
| Actions | 操作 |
| Done | 完成 |
| Skip | 跳过 |
| Continue | 继续 |
| Retry | 重试 |
| Copy | 复制 |
| Copied | 已复制 |
| Open | 打开 |

## Tone

- Prefer 第二人称 informal (你) over formal (您) — matches the rest of the product's casual tone.
- No emoji unless the original English string had one.
- Keep technical terms unitalicized; Chinese typography rarely uses italics.
