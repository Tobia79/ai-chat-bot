# Quickstart: AI Chat Web 验收指南

**Feature**: `001-ai-chat-web` | **Date**: 2026-07-15  
**依据**: [spec.md](./spec.md)、[plan.md](./plan.md)、[contracts/chat-api.md](./contracts/chat-api.md)

> 本文是实现完成后的验证手册，不含完整实现代码。实现任务见后续 `tasks.md`。

## 前置条件

- 已安装 Node.js 20+
- 仓库根目录存在实现产物（`package.json`、`app/` 等）
- 复制 `.env.example` → `.env.local`（或文档约定的 env 文件）

## 环境配置

### Mock 验收（推荐先跑）

```env
MOCK_LLM=true
# 可不配置 LLM_API_KEY
```

### 真实模型

```env
MOCK_LLM=false
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

> 切勿把真实密钥写入仓库或 README。

## 启动

```bash
npm install
npm run dev
```

浏览器打开文档中写明的本地地址（预期 `http://localhost:3000`）。

健康检查：`GET /api/health` 应返回 `mode: "mock"` 或 `"live"`（见契约）。

## 验收场景清单

对照规格最低验收 + 澄清结论：

| # | 操作 | 期望 |
|---|------|------|
| 1 | Mock 下新建会话并发送问题 | 状态经历等待/生成中，内容逐步出现，最终完成 |
| 2 | 生成中点停止 | ≤1s 停止；保留已生成片段；状态为已取消；可再发送 |
| 3 | 会话 A 生成中切到 B 再返回 A | B 无 A 的增量；A 进度/结果正确 |
| 4 | A 生成中在 B 发送 | 被阻止并中文提示；不出现第二路回复 |
| 5 | 创建两会话分别聊天后切换 | 历史互不污染 |
| 6 | 删除一会话 | 自列表消失；其余不受影响 |
| 7 | 刷新页面 | 会话与已落盘消息仍在 |
| 8 | 关闭 Mock、清空密钥后发消息 | 可读配置错误；页面不卡死 |
| 9 | 模拟上游失败后点重试 | 同助手气泡就地重试，无重复用户气泡 |
| 10 | `Enter` / `Shift+Enter` | 发送 / 换行 |
| 11 | 助手含 Markdown/代码块 | 可读渲染 |
| 12 | 检索前端构建产物 | 无 API Key 明文（`npm run build` 后检查 `.next` 或导出产物） |

## 测试命令

```bash
npm test
```

期望：至少 `message-reducer` 或 SSE 解析相关用例通过（FR-016 / SC-008）。

## 已知限制（实现时应在产品 README 复述）

- 无账号与云同步；清站点数据会丢会话
- 全局单路生成；多会话并行为升级预留
- 上下文按最近约 40 条截断（见 research R7）
- 刷新会中断进行中的生成连接

## 相关文档

- 数据形状：[data-model.md](./data-model.md)
- HTTP/SSE 契约：[contracts/chat-api.md](./contracts/chat-api.md)
- 技术取舍：[research.md](./research.md)
