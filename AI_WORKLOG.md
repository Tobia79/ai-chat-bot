# AI 工作记录（AI_WORKLOG）

## 使用的工具

- Cursor Agent（Composer）配合 Spec Kit 流程：`speckit-specify` → `clarify` → `plan` → `tasks` → `implement`
- 本地技能：`zh-prefer`（中文文档/文案）、`grill-me`（定 README / 密钥 / UI 范围）

## AI 帮助完成的工作

- 从作业 README 产出规格、澄清结论、实现计划、契约与任务清单
- 搭建 Next.js + TypeScript 单仓应用（页面、SSE API、Mock/兼容 Provider）
- 实现会话管理、全局单路生成、就地重试、localStorage 持久化与中文 UI 文案
- 编写 Vitest：`message-reducer`、`sse` 解析
- 撰写产品 README、备份原题为 `ASSIGNMENT.md`

## 发现并修正的问题

- 澄清前「切会话时生成如何处理 / 是否多路并行 / 重试语义 / 停止保留片段 / Mock 优先级」未写死，已写入规格后再实现，避免串流与验收口径不一致
- 根目录原 `README.md` 为题目原文，与产品文档冲突；按约定备份为 `ASSIGNMENT.md` 再写产品说明
- 真实密钥不得进入仓库；实现采用 Mock 默认可跑，密钥仅允许出现在被 gitignore 的 `.env.local`
- SSE 不完整帧需缓冲 `rest`，单测覆盖半包场景，避免前端解析丢字
