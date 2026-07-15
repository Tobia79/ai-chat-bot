# Tasks: AI Chat Web 应用

**Input**: Design documents from `/specs/001-ai-chat-web/`

**Prerequisites**: plan.md（必需）、spec.md（用户故事）、research.md、data-model.md、contracts/、quickstart.md

**Tests**: 规格 FR-016 要求至少一类核心逻辑自动化测试 → 本清单包含 Vitest 任务（`message-reducer` / `sse`）

**Organization**: 按用户故事分阶段，便于增量交付与独立验收

**Grill 约定**（已写入相关任务）:
- 题目 `README.md` → `ASSIGNMENT.md`；根目录产品 `README.md`
- `deepseekkey.md` 不提交；配好 `.env.local` 后删除
- UI 为朴素可验收工作台（`globals.css`），不做视觉精修

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、互不依赖未完成任务）
- **[Story]**: 所属用户故事（如 US1）；Setup / Foundational / Polish 不加 Story 标签
- 每条描述含确切文件路径

## Path Conventions

路径相对仓库根目录，与 [plan.md](./plan.md) 一致：`app/`、`components/`、`lib/`、`server/`、`tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 在仓库根初始化 Next.js + TypeScript，保留已有 `.specify/`、`specs/`、`.cursor/`

- [x] T001 在仓库根初始化 Next.js 15 App Router + TypeScript 项目结构（生成 `package.json`、`tsconfig.json`、`next.config.ts`、`app/layout.tsx`、`app/page.tsx`、`app/globals.css`），避免覆盖 `.specify/` 与 `specs/`
- [x] T002 安装运行依赖：`openai`、`zod`、`react-markdown`、`remark-gfm` 及选定的代码高亮包，写入 `package.json`
- [x] T003 [P] 安装并配置 Vitest（含 `vitest.config.ts`、`package.json` 中 `test` 脚本），使 `tests/**/*.test.ts` 可运行
- [x] T004 [P] 配置 `.gitignore`：忽略 `.env.local`、`.env*.local`、`.next/`、`node_modules/`；确认不会把密钥提交进库
- [x] T005 [P] 创建 `.env.example`，声明 `MOCK_LLM`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`（无真实密钥）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事共享的类型、配置裁决与健康检查；完成前不得开始故事实现

**⚠️ CRITICAL**: 本阶段未完成前，不开始 US1–US5

- [x] T006 按 data-model 定义领域类型与消息状态枚举，写入 `lib/types.ts`
- [x] T007 [P] 实现环境变量读取与 Mock/live/unconfigured 裁决，写入 `server/config.ts`（裁决：显式 `MOCK_LLM=true` → Mock；否则有密钥 → live；否则 unconfigured）
- [x] T008 [P] 定义 LLM Provider 接口类型，写入 `server/llm/types.ts`
- [x] T009 实现 `GET /api/health`（返回 `ok`/`mode`/`model`，永不回显密钥），写入 `app/api/health/route.ts`
- [x] T010 实现消息状态归约纯函数（pending/streaming/completed/failed/cancelled、就地重试清空），写入 `lib/message-reducer.ts`
- [x] T011 [P] 为消息归约编写单元测试，写入 `tests/message-reducer.test.ts`
- [x] T012 搭建朴素工作台壳层：根布局与基础排版（中文占位文案），写入 `app/layout.tsx`、`app/globals.css`、`app/page.tsx`

**Checkpoint**: 类型、配置、health、reducer 与基础壳可用 → 可开始用户故事

---

## Phase 3: User Story 1 - 发送消息并获得流式回复 (Priority: P1) 🎯 MVP

**Goal**: 单会话下发送、流式展示、停止并保留片段、Enter/Shift+Enter、Markdown 渲染

**Independent Test**: Mock 模式下单会话发送问题，看见逐步输出；停止后保留片段且可再发送

### Tests for User Story 1

- [x] T013 [P] [US1] 编写客户端 SSE 解析单元测试（delta/error/done），写入 `tests/sse.test.ts`

### Implementation for User Story 1

- [x] T014 [P] [US1] 实现 Mock 流式 Provider（可感知逐步输出、可响应 abort），写入 `server/llm/mock.ts`
- [x] T015 [P] [US1] 实现 OpenAI 兼容流式 Provider（`baseURL` + API Key + model），写入 `server/llm/openai-compatible.ts`
- [x] T016 [US1] 实现 `POST /api/chat` SSE（Zod 校验请求体、按 contracts 发 meta/delta/error/done、支持 Abort），写入 `app/api/chat/route.ts`
- [x] T017 [P] [US1] 实现客户端 SSE 读取与事件解析，写入 `lib/sse.ts`
- [x] T018 [P] [US1] 实现 Markdown/代码块渲染封装，写入 `lib/markdown.tsx`
- [x] T019 [P] [US1] 实现输入区（Enter 发送、Shift+Enter 换行、空内容不发送），写入 `components/Composer.tsx`
- [x] T020 [P] [US1] 实现消息气泡（角色、内容、状态展示），写入 `components/MessageBubble.tsx`
- [x] T021 [US1] 实现消息列表（滚动、流式追加展示），写入 `components/MessageList.tsx`
- [x] T022 [P] [US1] 实现状态条（等待/生成中/完成/失败/已取消 中文文案），写入 `components/StatusBar.tsx`
- [x] T023 [US1] 在 `app/page.tsx` 接线：默认会话、发送→pending→streaming→完成、停止→cancelled 且保留 content、调用 `/api/chat`

**Checkpoint**: US1 可独立验收（Mock 下流式 + 停止）→ MVP 可演示

---

## Phase 4: User Story 4 - 并发与切换时状态不出错 (Priority: P1)

**Goal**: 全局单路生成；切会话后台继续按 messageId 写回；跨会话发送被拒并提示

**Independent Test**: A 生成中切到 B 无串流；在 B 发送被阻止；切回 A 见进度；连点发送不双重生成

### Implementation for User Story 4

- [x] T024 [US4] 实现全局生成控制器（单路互斥、AbortController、当前 conversationId/messageId），写入 `lib/generation-controller.ts`
- [x] T025 [US4] 将流式 `delta` 按 `(conversationId, messageId)` 写入 store，与当前选中会话解耦，更新 `app/page.tsx` 与相关 lib 逻辑
- [x] T026 [US4] 实现跨会话/重复发送拦截：活动生成存在时拒绝并中文提示，接入 `components/Composer.tsx` / `components/StatusBar.tsx`
- [x] T027 [US4] 补充会话切换 UI 最小能力（至少能切到另一会话以验证后台写回），可先用临时列表或占位，写入 `components/ConversationList.tsx`（若尚无）与 `app/page.tsx`

**Checkpoint**: FR-011/012 行为可验收；为 US2 完整会话管理打底

---

## Phase 5: User Story 2 - 管理多个会话并恢复历史 (Priority: P2)

**Goal**: 创建/切换/删除会话；localStorage 持久化；刷新后恢复

**Independent Test**: 两会话分别聊天后切换历史正确；删除互不影响；刷新后仍在

### Implementation for User Story 2

- [x] T028 [US2] 实现 localStorage 读写（键 `ai-chat-web:v1`）、刷新时将 `pending`/`streaming` 降级为 `cancelled`，写入 `lib/conversation-store.ts`
- [x] T029 [US2] 完善会话列表：新建、切换、删除、默认标题，写入 `components/ConversationList.tsx`
- [x] T030 [US2] 将 App 状态与 `conversation-store` 同步（加载、每次变更落盘、`currentConversationId`），更新 `app/page.tsx`
- [x] T031 [US2] 删除当前会话时自动落到其余会话或空状态，保证界面可用，更新 `app/page.tsx` / `components/ConversationList.tsx`

**Checkpoint**: US2 独立验收通过（切换 + 刷新）

---

## Phase 6: User Story 3 - 失败可感知并可重试 (Priority: P2)

**Goal**: 失败不卡死；中文错误提示；就地重试同一助手消息

**Independent Test**: 制造失败可见错误与重试；重试不新增用户气泡

### Implementation for User Story 3

- [x] T032 [US3] 统一将上游/网络/配置错误映射为中文 `error` 与 `failed` 状态，更新 `lib/message-reducer.ts` 与 `lib/sse.ts` / `app/page.tsx` 错误处理
- [x] T033 [US3] 在 `components/MessageBubble.tsx` 展示失败说明与「重试」入口
- [x] T034 [US3] 实现就地重试（同 `assistant.id`，清空 content/error → pending，再调 `/api/chat`），更新 `app/page.tsx` 与 `lib/message-reducer.ts`

**Checkpoint**: US3 独立验收通过

---

## Phase 7: User Story 5 - 密钥不落前端且可无密钥验收 (Priority: P2)

**Goal**: 显式 Mock 优先；未配置报错；密钥不进构建产物；本地密钥备忘处理

**Independent Test**: `MOCK_LLM=true` 走通 P1；无 Mock 无密钥时报错；build 产物检索无 Key

### Implementation for User Story 5

- [x] T035 [US5] 核对 `server/config.ts` 与 `app/api/chat/route.ts`：显式 Mock 即使有密钥也走 Mock；unconfigured 返回 503 JSON（合约文案）
- [x] T036 [US5] 确认无任何 `NEXT_PUBLIC_*` 密钥变量；服务端模块仅在 `server/` 与 `app/api/**` 引用 `LLM_API_KEY`
- [x] T037 [US5] 将真实密钥写入 `.env.local`（本地）后，**删除**仓库中的 `deepseekkey.md`；确认该文件未进入 Git
- [x] T038 [US5] 执行 `npm run build`，对构建产物做文本检索，确认不存在 API Key 明文（记录检查方式供 README）

**Checkpoint**: US5 / SC-006 / SC-007 可验收

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 文档、工作日志、走查与收尾

- [x] T039 将现有题目 `README.md` 备份为根目录 `ASSIGNMENT.md`（保留作业原文）
- [x] T040 重写产品 `README.md`：启动方式、架构说明（前后端边界）、环境变量、Mock/真实模式、已知限制、测试命令（中文）
- [x] T041 [P] 撰写 `AI_WORKLOG.md`（使用的 AI 工具、完成内容、发现并修正的错误；不含密钥）
- [x] T042 对照 `specs/001-ai-chat-web/quickstart.md` 逐项走查验收清单并修缺陷
- [x] T043 [P] 最终确认：`.gitignore` 覆盖 `.env.local`；`deepseekkey.md` 已删除或不在版本库；`ASSIGNMENT.md` 与产品 `README.md` 并存清晰

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**：无依赖，立即开始
- **Phase 2 Foundational**：依赖 Setup；**阻塞**所有用户故事
- **Phase 3 US1**：依赖 Foundational → MVP
- **Phase 4 US4**：依赖 US1 的流式链路（控制器建在可发送流之上）
- **Phase 5 US2**：依赖 US1；与 US4 的列表占位可衔接完善
- **Phase 6 US3**：依赖 US1 流式与消息模型
- **Phase 7 US5**：依赖 chat/config 已存在；可与 US3 并行（不同关注点）
- **Phase 8 Polish**：依赖拟交付的用户故事完成

### User Story Dependencies

- **US1 (P1)**：Foundational 之后即可；无其他故事依赖 → MVP
- **US4 (P1)**：建议在 US1 之后（需流式写回能力）
- **US2 (P2)**：依赖 US1；可与 US3/US5 并行（文件冲突时优先串行 `app/page.tsx`）
- **US3 (P2)**：依赖 US1
- **US5 (P2)**：依赖 Foundational + chat 路由；与 UI 故事弱耦合

### Within Each User Story

- 测试任务（若有）先于或紧随被测模块实现，并保证失败用例先红后绿
- Provider / 契约 → 客户端解析 → UI → 页面接线
- 故事完成后再进入下一优先级（或按上表并行）

### Parallel Opportunities

- T003/T004/T005 可并行
- T007/T008 可并行；T011 可在 T010 后并行推进文档外工作
- US1 内 T014/T015、T017–T020/T022 标 [P] 的可并行
- US3/US5 在 US1 完成后可由不同人并行（注意 `app/page.tsx` 合并）

---

## Parallel Example: User Story 1

```bash
# 可并行：
Task: "T014 实现 Mock 流式 Provider → server/llm/mock.ts"
Task: "T015 实现 OpenAI 兼容流式 Provider → server/llm/openai-compatible.ts"
Task: "T017 实现客户端 SSE 解析 → lib/sse.ts"
Task: "T018 Markdown 封装 → lib/markdown.tsx"
Task: "T019 Composer → components/Composer.tsx"
Task: "T020 MessageBubble → components/MessageBubble.tsx"
Task: "T022 StatusBar → components/StatusBar.tsx"

# 随后串行接线：
Task: "T016 POST /api/chat → app/api/chat/route.ts"
Task: "T021 MessageList → components/MessageList.tsx"
Task: "T023 app/page.tsx 接线"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1 Setup
2. 完成 Phase 2 Foundational
3. 完成 Phase 3 US1
4. **STOP**：用 Mock 验收流式 + 停止
5. 再进入 US4 → US2/US3/US5 → Polish

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1 → MVP 演示
3. US4 → 并发/串流正确性
4. US2 → 会话与刷新
5. US3 → 失败重试
6. US5 → 安全与 Mock 裁决收口
7. Polish → 文档与提交物

### Parallel Team Strategy

1. 共同完成 Setup + Foundational
2. 开发者 A：US1 → US4
3. 开发者 B：US1 完成后接手 US2 + US3（错开 `page.tsx`）
4. 任一成员收尾 US5 + Polish

---

## Notes

- [P] = 不同文件且无未完成依赖
- [USn] 映射 spec 用户故事，便于追溯
- UI 保持朴素；文案中文（zh-prefer）
- 每完成一个逻辑组可提交（若用户要求再 commit）
- 在任意 Checkpoint 可单独验收当前故事
- 避免：无路径的空泛任务、多任务抢改同一文件却标 [P]、破坏故事独立性的耦合
