# Research: AI Chat Web 应用

**Feature**: `001-ai-chat-web` | **Date**: 2026-07-15

本文档消解计划阶段的技术未知项，并落实澄清阶段推迟的「多轮上下文」决策。

---

## R1. 应用骨架：Next.js App Router vs Vite + 独立后端

**Decision**: Next.js 15（App Router）+ TypeScript 单仓。

**Rationale**:
- API Route 天然保证模型密钥只在服务端可读，满足 FR-013。
- 一套命令即可启动前后端，利于 5 分钟内验收启动（SC-001）。
- SSE 流式在 Route Handler 中返回 `ReadableStream` 已是成熟模式。

**Alternatives considered**:
- Vite React + Express/Hono：边界更「教科书」，但双进程与 CORS/代理增加作业摩擦。
- 纯前端直连模型：密钥会暴露，直接否决。

---

## R2. 流式传输协议：SSE vs WebSocket vs fetch 分段 JSON

**Decision**: HTTP `POST /api/chat` + **SSE**（`text/event-stream`），事件类型见 `contracts/chat-api.md`。

**Rationale**:
- 单向服务器推送匹配「助手流式回复」；客户端用 `AbortController` 即可实现停止（FR-004）。
- 比 WebSocket 简单，无需会话级连接管理。
- 事件可携带 `delta` / `error` / `done`，便于状态机映射。

**Alternatives considered**:
- WebSocket：双向能力用不上，复杂度更高。
- 一次 JSON 完整返回：违反 FR-002。

---

## R3. 模型接入：OpenAI 官方 vs 兼容端点（如 DeepSeek）

**Decision**: 使用 `openai` SDK，通过环境变量配置 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`，对接 **OpenAI-compatible** Chat Completions 流式接口。

**Rationale**:
- 规格假定「一类兼容端点」即可；与 DeepSeek 等兼容服务一致。
- SDK 处理 SSE 解析，减少自研协议风险。

**Alternatives considered**:
- 手写 `fetch` 解析上游 SSE：可控但易错，留作必要时降级。
- 多 Provider 抽象 UI：加分项，首期不做。

---

## R4. Mock 与密钥裁决

**Decision**: 环境变量 `MOCK_LLM=true|false`（仅显式 `true` 开启）。裁决：`MOCK_LLM=true` → Mock；否则有 `LLM_API_KEY` → 真实；否则请求返回可理解配置错误（HTTP 503 + 业务错误事件/JSON）。

**Rationale**: 对齐澄清 Q5 与 FR-015，避免「无密钥自动 Mock」造成误判。

**Alternatives considered**:
- 无密钥自动 Mock：验收方便但行为不透明，已在澄清中否决。

---

## R5. 会话持久化

**Decision**: 浏览器 `localStorage` 存储完整 `Conversation[]`（含消息）；键名如 `ai-chat-web:v1`。

**Rationale**: FR-009 最低要求；单用户本地场景无需服务端库。

**Alternatives considered**:
- IndexedDB：容量更大，首期过重。
- 服务端持久化：超出范围。

---

## R6. 全局单路生成 + 后台写回

**Decision**:
- 客户端维护单一 `GenerationController`：持有当前 `conversationId`、`messageId`、`AbortController`。
- 发送前若已有活动生成 → 拒绝并提示（含跨会话）。
- 流式 `delta` **按 messageId/conversationId 写入 store**，与当前 UI 选中会话解耦，从而支持「切走后后台继续、切回可见」。
- 停止：`abort()` + 将助手消息标为 `cancelled`，**保留已有 content**。

**Rationale**: 直接落实澄清 Q1/Q2/Q4 与 FR-011/012/004。

**Alternatives considered**:
- 切会话即取消：与 Q1 冲突。
- 多路并行：升级版预留，首期不做。

---

## R7. 多轮上下文（澄清阶段 Deferred）

**Decision**: 每次请求向模型发送**当前会话**中可用于上下文的消息序列：
- 包含：`user` 且内容非空；`assistant` 且状态为 `completed` 或 `cancelled`（cancelled 带已生成片段）。
- 排除：`pending` / `streaming` / `failed` 的助手消息（重试时该条以「待重新生成」处理，请求体用清空后的占位前历史）。
- 截断：从最早消息丢弃，保留最近 **N=40** 条（user+assistant 合计）；足够作业演示，避免超大 payload。

**Rationale**: 多轮连贯性必需；固定条数截断实现简单、可测；token 精确计量非首期目标。

**Alternatives considered**:
- 仅最近 1 轮：体验差。
- 按 token 精确截断：需 tokenizer，超范围。

---

## R8. 消息状态与重试

**Decision**: 助手消息显式状态机：`pending → streaming → completed | failed | cancelled`。失败就地重试：清空 `content`/`error`，同 id 回到 `pending` 再请求。

**Rationale**: 对齐 FR-003/010 与澄清 Q3；便于单测归约函数。

**Alternatives considered**:
- 追加新气泡重试：已否决。

---

## R9. Markdown 与测试策略

**Decision**: `react-markdown` + `remark-gfm`；代码块用轻量高亮（如 `react-syntax-highlighter` 或 `shiki` 择一，实现时取包体积较小者）。自动化测试优先 **Vitest** 覆盖 `message-reducer` 与 SSE 客户端解析（满足 FR-016）。

**Rationale**: 核心正确性在状态与流解析，而非 UI 快照。

**Alternatives considered**:
- E2E Playwright：加分项，首期可选不做。

---

## R10. UI 语言与文案

**Decision**: 面向用户的文案、错误提示默认**中文**（遵循项目 zh-prefer）。

**Rationale**: 与仓库 skill 及本地验收习惯一致。

---

## 已消解的 NEEDS CLARIFICATION

计划模板中原无未决技术栈项，现均已选定；澄清遗留的「上下文截断」见 R7。无残留 NEEDS CLARIFICATION。
