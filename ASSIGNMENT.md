# AI Chat Web

可本地运行的 AI 对话 Web 应用：流式输出、多会话、本地持久化、服务端代理模型调用。

## 启动方式

### 要求

- Node.js 20+

### 安装与运行

```bash
npm install
cp .env.example .env.local   # Windows 可手动复制
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

默认建议在 `.env.local` 中设置：

```env
MOCK_LLM=true
```

无真实密钥时即可验收流式对话、停止与会话管理。

### 真实模型（OpenAI 兼容，如 DeepSeek）

```env
MOCK_LLM=false
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

密钥只放在 `.env.local`，勿提交到 Git。

### 测试

```bash
npm test
```

### 生产构建

```bash
npm run build
npm start
```

## 架构说明

| 区域 | 职责 |
|------|------|
| `app/` | 页面与 API Route（`/api/chat` SSE、`/api/health`） |
| `components/` | 会话列表、消息、输入区、状态条 |
| `lib/` | 类型、消息归约、SSE 解析、localStorage、全局单路生成控制器 |
| `server/` | 环境裁决、Mock / OpenAI 兼容 Provider（密钥仅此处使用） |

**关键行为**

- 流式：`POST /api/chat` 返回 SSE（`meta` / `delta` / `error` / `done`）
- 全局同一时刻仅一路生成；切会话后流继续写回原会话
- 失败就地重试同一助手消息；停止后保留已生成片段
- 会话持久化键：`ai-chat-web:v1`（localStorage）

更细契约见 `specs/001-ai-chat-web/contracts/chat-api.md`。

## 环境变量

见 [.env.example](./.env.example)。裁决顺序：显式 `MOCK_LLM=true` → Mock；否则有 `LLM_API_KEY` → 真实调用；否则返回配置错误。

**不会**使用任何 `NEXT_PUBLIC_*` 暴露密钥。

## 已知限制

- 无账号与云同步；清除站点数据会丢失会话
- 首期不支持多会话并行生成（升级预留）
- 发给模型的上下文按约 40 条截断
- 刷新会中断进行中的网络流，未落盘增量可能丢失
- UI 为朴素验收工作台，非视觉精修版

## 作业原题

原题目说明已备份为 [ASSIGNMENT.md](./ASSIGNMENT.md)。

## 规格与计划

见 `specs/001-ai-chat-web/`（spec / plan / tasks / quickstart）。
