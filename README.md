# ContentOS 中文创作者工作流系统

ContentOS 是面向中文内容创业者、职业 IP、小品牌内容团队和小型 MCN 的创作决策与执行工作台。当前仓库实现了一个可运行 MVP：热点发现、选题池、人设记忆、内容工作台、内容日历、轻量数据复盘、团队权限、数据源管理、Agent 运行记录和审计日志。

## 技术栈

- Next.js 14 App Router、React、TypeScript、Tailwind CSS
- 本地 UI 组件、Recharts、Zod
- Prisma ORM、PostgreSQL、pgvector、Redis、Docker Compose
- 统一 AI Provider 抽象与 mock provider
- 平台数据源 Adapter 抽象与 mock platform adapter
- Vitest、Playwright 配置、基础 GitHub Actions CI

## 本地启动

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

访问 `http://localhost:3000` 会进入 Dashboard。MVP 默认登录账号：

```text
owner@contentos.local
contentos123
```

## 验证命令

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 已实现能力

- Dashboard：今日热点、待处理选题、待审核内容、本周发布计划、异常提醒、Agent 状态。
- 热点中心：mock 合规热点数据、平台/行业结构、热度曲线、风险标签、一键生成选题。
- 选题池：状态、评分、平台、人设/热点关联、生成 brief、加入日历。
- 人设记忆：品牌档案、语气说明书、禁用表达、高频表达、目标受众、版本管理。
- 内容工作台：选题 brief、人设、平台目标、草稿编辑、风险检查、平台适配、审核、排期。
- 内容日历：周视图、发布计划、按按钮调整日期。
- 数据分析：mock CSV/JSON 导入结构、指标趋势、周报生成、建议回流选题池。
- 数据源：sourceType、platform、authorizationStatus、lastSyncedAt、模拟连接、删除授权数据。
- 团队权限：Owner/Admin/Editor/Analyst/Viewer、成员邀请、角色修改、RBAC 常量。
- Agent 运行中心：输入/输出摘要、token、成本、耗时、状态、错误信息、重跑。
- 设置：workspace、AI provider、Prompt 模板版本、API Key/Webhook 预留、审计日志。

## API 覆盖

已实现 REST Route Handlers，覆盖认证、workspace、热点、选题、人设、内容、日历、数据分析、数据源、Agent 和审计日志。主要路径包括：

- `/api/auth/register`、`/api/auth/login`、`/api/me`
- `/api/workspaces`、`/api/workspaces/:id/members`
- `/api/hotspots`、`/api/hotspots/refresh`、`/api/hotspots/:id/generate-topic`
- `/api/topics`、`/api/topics/:id/generate-brief`、`/api/topics/:id/add-to-calendar`
- `/api/personas`、`/api/personas/:id/import-content`、`/api/personas/:id/versions`
- `/api/contents/generate`、`/api/contents/:id/risk-check`、`/api/contents/:id/schedule`
- `/api/calendar`、`/api/analytics/overview`、`/api/analytics/reports/generate`
- `/api/data-sources`、`/api/agent-runs`、`/api/audit-logs`

## 架构说明

核心目录：

```text
src/app               Next.js 页面和 API Route Handlers
src/components        本地 UI、布局、模块组件
src/server/agents     统一 Agent 框架和具体 Agent
src/server/ai         AI Provider 抽象、mock provider、Prompt 模板
src/server/platforms  平台数据源 Adapter 抽象和 mock adapter
src/server/services   业务服务与 MVP 内存数据仓库
src/server/rbac       RBAC 权限定义和校验
src/server/audit      审计日志服务
prisma                schema 和 seed
```

MVP 页面使用内存 mock store 保证开箱可运行；Prisma schema 和 seed 已包含企业级数据模型，便于接入 PostgreSQL 后将服务层替换为 Prisma repository。

## 已预留能力

- 官方平台 OAuth/API 接入：通过 PlatformDataAdapter 扩展。
- 真实模型供应商接入：通过 AiProvider 扩展。
- pgvector 向量检索：schema 已预留 `Unsupported("vector")` 字段。
- Redis/BullMQ 异步 Agent 队列：MVP 使用 in-process 队列记录任务状态、结果、错误和耗时，热点刷新与数据复盘已通过队列入口执行；docker-compose Redis 已预留给 BullMQ worker。
- API Key、Webhook、UsageEvent、CreditLedger、数据保留策略。
- 内容版本 diff、复杂日历拖拽、真实自动发布。

## 合规边界

- 不做未经授权的大规模平台数据搬运。
- 不做绕过平台限制的爬虫。
- 所有数据源必须标记来源类型、授权状态和同步时间。
- 所有重要业务操作写审计日志。
- 所有 Agent 调用写 AgentRun。
- 生成内容保留风险检查入口，默认避开医疗、金融、法律、时政等高风险场景。

## 后续迭代建议

1. 将 `src/server/services/mock-store.ts` 替换为 Prisma repository，实现真实多租户数据隔离。
2. 接入 Auth.js 或企业自定义认证，完善 session、CSRF、防暴力登录和邀请流程。
3. 将 in-process Agent 队列替换为 Redis/BullMQ worker，并把内容生成等长任务纳入异步执行。
4. 增加真实 AI provider、模型成本计算、prompt A/B 和输出质量反馈。
5. 接入官方授权平台 API，并完善授权删除、数据保留与审计证据链。
