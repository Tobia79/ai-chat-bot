# Contract: Chat API

**Feature**: `001-ai-chat-web` | **Date**: 2026-07-15  
**Base**: 同源 Next.js（开发默认 `http://localhost:3000`）

本契约描述浏览器与服务端之间的接口。上游 OpenAI 兼容供应商协议不对外暴露。

---

## GET `/api/health`

探测服务是否就绪及当前模式（**不得返回密钥**）。

### Response `200`

```json
{
  "ok": true,
  "mode": "mock" | "live" | "unconfigured",
  "model": "string | null"
}
```

| `mode` | 含义 |
|--------|------|
| `mock` | `MOCK_LLM=true` |
| `live` | 未开 Mock 且已配置密钥 |
| `unconfigured` | 未开 Mock 且无密钥 |

---

## POST `/api/chat`

发起一轮助手生成（流式）。

### Headers

| Header | 值 |
|--------|------|
| `Content-Type` | `application/json` |
| `Accept` | `text/event-stream` |

### Request Body

```json
{
  "conversationId": "uuid",
  "messageId": "uuid",
  "messages": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好！" }
  ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `conversationId` | 是 | 会话 id（服务端可用于日志；首期可不落库） |
| `messageId` | 是 | 本轮助手消息 id |
| `messages` | 是 | 已过滤/截断的上下文；最后一条通常为触发本轮的 user |

**校验**:
- `messages` 至少 1 条且最后一条 `role=user`
- 任一条 `content` 为 string；拒绝空数组

### Response（成功开始流）：`200` + `Content-Type: text/event-stream`

SSE 事件行格式：`event: <name>\ndata: <json>\n\n`

#### `event: meta`（可选，首包）

```json
{ "conversationId": "uuid", "messageId": "uuid", "mode": "mock" | "live" }
```

#### `event: delta`

```json
{ "content": "增量文本" }
```

客户端将 `content` 追加到对应助手消息。

#### `event: error`

```json
{ "message": "中文可读错误", "code": "CONFIG" | "UPSTREAM" | "ABORT" | "UNKNOWN" }
```

其后流结束。客户端将消息标为 `failed`（若非用户 abort）。

#### `event: done`

```json
{ "finishReason": "stop" | "abort" | "error" }
```

### Response（无法流式开始）

非流式 JSON 错误，例如未配置：

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{ "message": "未配置模型密钥，请设置 LLM_API_KEY 或将 MOCK_LLM=true", "code": "CONFIG" }
```

| HTTP | 场景 |
|------|------|
| 400 | 请求体非法 |
| 503 | `unconfigured` |
| 502 | 上游模型错误（也可在已开流后用 `event: error`） |

### 停止生成

客户端中止 `fetch`/`ReadableStream`（`AbortController.abort()`）。服务端应停止向上游读取并结束流；可将最后事件设为 `done` + `finishReason: abort`，或直接关闭连接。客户端本地仍须将状态设为 `cancelled` 并保留片段。

---

## 安全约定

- 响应与错误中**禁止**回显 `LLM_API_KEY` 或 `.env` 内容。
- 前端构建产物不得内联密钥；仅 `NEXT_PUBLIC_*` 可进浏览器——本项目**不为密钥定义任何 `NEXT_PUBLIC_` 变量**。

---

## 客户端责任（契约配合）

- 全局单路：并发第二路不得调用本 API（或调用后立即 abort，仍以客户端拒绝为准）。
- 按 `messageId` 应用 `delta`，禁止只写入「当前选中会话」。
- 就地重试：同一 `messageId`，`messages` 中不含该失败助手条目。
