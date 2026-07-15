# Data Model: AI Chat Web 应用

**Feature**: `001-ai-chat-web` | **Date**: 2026-07-15  
**来源**: [spec.md](./spec.md) Key Entities + Clarifications

## 实体关系

```text
AppState 1 ── * Conversation 1 ── * Message
                │
                └──（运行时）0..1 active Generation（全局互斥）
```

---

## Conversation（会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `title` | string | 默认「新会话」；首条用户消息可截断生成标题（可选增强） |
| `createdAt` | number (epoch ms) | 创建时间 |
| `updatedAt` | number (epoch ms) | 任意消息变更时更新 |
| `messages` | Message[] | 有序消息列表 |

**校验**:
- `id` 非空且全局唯一
- 删除会话即删除其全部消息

---

## Message（消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `conversationId` | string | 所属会话 |
| `role` | `"user"` \| `"assistant"` | 角色 |
| `content` | string | 文本；停止后保留已生成片段 |
| `status` | MessageStatus | 见状态机；用户消息一般为 `completed` |
| `error` | string \| null | 失败时的可读错误（中文） |
| `createdAt` | number | 创建时间 |

### MessageStatus

```text
用户消息: completed（发送成功入列即可）

助手消息:
  pending ──► streaming ──► completed
                 │
                 ├──► failed
                 └──► cancelled
  failed ──(就地重试)──► pending
```

| 状态 | 含义 |
|------|------|
| `pending` | 已创建助手占位，等待首包 |
| `streaming` | 正在追加 `content` |
| `completed` | 正常结束 |
| `failed` | 出错，可就地重试 |
| `cancelled` | 用户停止；保留当前 `content` |

**校验**:
- 空/纯空白用户输入不得入列
- 就地重试不得新增用户消息；同一 `assistant.id` 清空 `content`/`error` 后重回 `pending`

---

## Generation（生成任务，运行时）

非持久化；用于全局互斥与 Abort。

| 字段 | 类型 | 说明 |
|------|------|------|
| `conversationId` | string | 目标会话 |
| `messageId` | string | 目标助手消息 |
| `abortController` | AbortController | 停止/卸载时 abort |
| `startedAt` | number | 可选，诊断用 |

**规则**:
- 全局至多一个活动 Generation
- 流增量只更新匹配的 `(conversationId, messageId)`
- 活动存在时，其他会话 `send` 必须拒绝并提示

---

## AppState（客户端根状态）

| 字段 | 类型 | 说明 |
|------|------|------|
| `conversations` | Conversation[] | 全部会话 |
| `currentConversationId` | string \| null | 当前 UI 选中 |
| `generation` | Generation \| null | 全局活动生成 |

---

## 持久化 Schema（localStorage）

**Key**: `ai-chat-web:v1`

```json
{
  "version": 1,
  "conversations": [ /* Conversation */ ],
  "currentConversationId": "uuid-or-null"
}
```

**规则**:
- 不持久化 `generation` / AbortController
- 刷新时：若存在 `streaming`/`pending` 助手消息，降级为 `cancelled`（保留 content）或 `failed` 策略二选一；**推荐**：`pending`/`streaming` → `cancelled`，避免复活半连接
- 序列化前可剥离过大临时字段

---

## 服务端运行配置（非实体，环境）

| 变量名 | 含义 |
|--------|------|
| `MOCK_LLM` | `true` 时强制 Mock |
| `LLM_API_KEY` | 模型密钥（仅服务端） |
| `LLM_BASE_URL` | 兼容 API Base URL |
| `LLM_MODEL` | 模型名 |

裁决：显式 Mock → 真实密钥 → 配置错误（见 contracts）。

---

## 上下文消息映射（发给模型）

对当前会话 `messages` 过滤后映射为 OpenAI 风格 `{ role, content }`：
- 纳入：`user` + 非空 content；`assistant` 且 `completed|cancelled` 且 content 可非空
- 排除：`pending|streaming|failed`
- 截断：保留最近 40 条（见 research R7）
