# Implementation Plan: AI Chat Web 应用

**Branch**: `001-ai-chat-web` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-chat-web/spec.md`

**Note**: 由 `/speckit-plan` 根据规格与澄清会话生成；实现任务清单留给 `/speckit-tasks`。

## Summary

构建可本地运行的 AI 对话 Web 应用：用户多会话聊天、服务端代理调用 OpenAI 兼容模型（流式 SSE）、密钥仅存环境变量、显式 Mock 可验收、浏览器本地持久化会话。前端用状态机式消息生命周期管理生成；全局同一时刻仅一路生成，切会话时后台继续写回原会话且防串流。技术选型为 **Next.js（App Router）+ TypeScript**，API Route 作为服务端边界，Vitest 覆盖消息状态或流式解析核心逻辑。

## Technical Context

**Language/Version**: TypeScript 5.x（严格模式），Node.js 20+

**Primary Dependencies**: Next.js 15（App Router）、React 19、`openai` SDK（兼容自定义 `baseURL`）、`react-markdown` + 代码高亮、Zod（请求体校验）

**Storage**: 浏览器 `localStorage`（会话与消息）；服务端无业务库

**Testing**: Vitest（优先测消息状态归约 / SSE 解析）；可选后续 Playwright（非首期必做）

**Target Platform**: 现代桌面浏览器（Chrome/Edge/Firefox 近期版本）；本地开发机 Windows/macOS/Linux

**Project Type**: Web 应用（同源前端页面 + 服务端 API Route）

**Performance Goals**: 停止后 ≤1s 进入可交互；首包在 Mock 下可感知逐步输出；真实模型延迟取决于外部 API

**Constraints**: API Key 不得进入客户端包；全局单路生成；显式 `MOCK_LLM` 优先于真实密钥；中文 UI 文案

**Scale/Scope**: 单用户本地；会话数十级、单会话消息百级内；首期不做多 Provider UI / 多路并行 / 账号体系

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

当前 `.specify/memory/constitution.md` 仍为占位模板，无强制技术/测试宪章条款。

| 门禁 | 状态 | 说明 |
|------|------|------|
| 宪章原则可执行 | PASS（不适用） | 无已批准原则可违反 |
| 规格范围对齐 | PASS | 计划仅覆盖 spec 必做与澄清结论 |
| 密钥与安全 | PASS | 服务端代理 + 环境变量；见 contracts |
| 复杂性控制 | PASS | 单仓 Next.js，无额外微服务 |

**Phase 1 后复核**：结构仍为单应用前后端分区；未引入超出规格的服务；门禁维持 PASS。

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-chat-web/
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── chat-api.md
└── tasks.md             # 由 /speckit-tasks 生成（本命令不创建）
```

### Source Code (repository root)

```text
app/
├── layout.tsx                 # 根布局
├── page.tsx                   # 聊天主界面
├── globals.css
└── api/
    ├── chat/
    │   └── route.ts           # POST：流式对话（SSE）
    └── health/
        └── route.ts           # GET：配置状态（不含密钥）

components/
├── ConversationList.tsx
├── MessageList.tsx
├── MessageBubble.tsx
├── Composer.tsx
└── StatusBar.tsx

lib/
├── types.ts                   # Conversation / Message / 状态枚举
├── conversation-store.ts      # localStorage 读写
├── generation-controller.ts   # 全局单路 + AbortController
├── message-reducer.ts         # 消息状态迁移（可单测）
├── sse.ts                     # 客户端 SSE 解析（可单测）
└── markdown.tsx               # Markdown 渲染封装

server/
├── llm/
│   ├── types.ts               # Provider 抽象
│   ├── openai-compatible.ts   # 真实流式调用
│   └── mock.ts                # Mock 流式
└── config.ts                  # 环境变量与 Mock/密钥裁决

tests/
├── message-reducer.test.ts
└── sse.test.ts

.env.example
README.md                      # 产品启动/架构/限制（实现阶段完善）
AI_WORKLOG.md                  # 提交要求
package.json
vitest.config.ts
```

**Structure Decision**: 采用 Next.js 单仓「页面 + `app/api` 服务端」分区，满足前后端职责清晰与密钥不落前端；用 `lib/`（客户端纯逻辑）与 `server/`（仅服务端）物理隔离，避免误把密钥打包进客户端。

## Complexity Tracking

> 无宪章违规需记录；表格留空。
