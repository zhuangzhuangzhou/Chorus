# Chorus 执行计划

## 总览

基于 PRD v0.17，分 6 个里程碑完成 MVP 开发。

**参考文档**：
- PRD: `docs/PRD_Chorus.md`
- 技术架构: `docs/ARCHITECTURE.md`
- UI 设计: `docs/design.pen`

**当前状态**: M3 Web UI 进行中（核心交互功能已完成，仅剩 Dashboard 统计和 Knowledge 搜索）

---

## 进度概览

| 里程碑 | 状态 | 完成度 |
|-------|------|--------|
| M0: 项目骨架 | ✅ 完成 | 100% |
| M1: 后端 API | ✅ 完成 | 100% |
| M2: MCP Server | ✅ 完成 | 100% |
| M2.5: Super Admin | ✅ 完成 | 100% |
| M3: Web UI | 🔄 进行中 | 85% |
| M4: Skill 文件 | ⏳ 待开始 | 0% |
| M5: 联调测试 | ⏳ 待开始 | 0% |

---

## 开发环境

### 启动方式

```bash
# 仅启动数据库（推荐开发模式）
pnpm docker:db

# 本地启动 Next.js（需要 Node 22）
nvm use 22
pnpm dev

# 完整容器启动（包含 app）
pnpm docker:up

# 停止所有容器
pnpm docker:down
```

### 数据库连接

| 环境 | DATABASE_URL |
|-----|-------------|
| 本地开发 | `postgresql://chorus:chorus@localhost:5433/chorus` |
| Docker 内部 | `postgresql://chorus:chorus@db:5432/chorus` |

### 常用命令

```bash
# Prisma 迁移
DATABASE_URL="postgresql://chorus:chorus@localhost:5433/chorus" pnpm db:migrate:dev --name <name>

# Prisma Studio
DATABASE_URL="postgresql://chorus:chorus@localhost:5433/chorus" pnpm db:studio

# 生成 Prisma Client
pnpm db:generate
```

---

## M0: 项目骨架 (Week 1) ✅ 完成

### 目标
搭建完整的项目基础设施，确保开发环境可用。

> **架构参考**: `ARCHITECTURE.md` §2 技术栈, §3 系统架构

### 任务清单

#### M0.1 项目初始化 ✅
> 架构参考: `ARCHITECTURE.md` §2.1 核心技术选型

- [x] 创建 Next.js 15 项目 (App Router)
- [x] 配置 TypeScript
- [x] 配置 ESLint + Prettier
- [x] 配置路径别名 (@/)

#### M0.2 数据库层 ✅
> 架构参考: `ARCHITECTURE.md` §4.0 数据库设计原则, §4.1 ER 图, §4.2 核心实体说明

- [x] 安装 Prisma 7.0.0 + @prisma/adapter-pg
- [x] 创建 schema.prisma（完整数据模型：11 个表）
  > 架构参考: `ARCHITECTURE.md` §4.0 无外键约束设计（relationMode = "prisma"）
- [x] 配置 PostgreSQL 连接（pg pool）
- [x] 生成 Prisma Client
- [x] 运行初始迁移

#### M0.3 容器化 ✅
> 架构参考: `ARCHITECTURE.md` §8 部署架构

- [x] 创建 Dockerfile（多阶段构建，Node 22）
- [x] 创建 docker-compose.yml
  - db 服务：默认启动
  - app 服务：需要 `--profile full` 启动
- [x] 配置环境变量 (.env.example)
- [x] 使用 pnpm 包管理器

#### M0.4 UI 基础 ✅
> 架构参考: `ARCHITECTURE.md` §2.1 核心技术选型 - UI 组件

- [x] 安装 Tailwind CSS v4
- [x] 安装 shadcn/ui 依赖
- [x] 创建 Button、Card 组件
- [x] 创建 Chorus 欢迎页面

#### M0.5 验证 ✅
- [x] docker compose up -d db 启动成功
- [x] 访问 http://localhost:3000 显示首页
- [x] Prisma migrate 成功
- [x] 数据库连接正常（/api/health 返回 ok）

### 交付物
- 可运行的 Next.js 项目
- 完整的 Prisma Schema
- Docker Compose 一键启动

---

## M1: 后端 API (Week 2) ✅ 完成

### 目标
实现所有核心实体的 CRUD API。

> **PRD 参考**: `PRD_Chorus.md` §5.4 MCP Server 实现, §7.3 数据模型
> **架构参考**: `ARCHITECTURE.md` §4 数据模型, §5 API 设计

### 任务清单

#### M1.1 基础设施 ✅
> 架构参考: `ARCHITECTURE.md` §3.1 整体架构 - Service Layer

- [x] 创建 API 响应格式标准
  > 架构参考: `ARCHITECTURE.md` §5.1 REST API
- [x] 创建错误处理中间件
- [x] 创建 Prisma client 单例
  > 代码位置: `src/lib/prisma.ts`
  > 架构参考: `ARCHITECTURE.md` §4.0 数据库设计原则

#### M1.2 认证 API ✅
> 架构参考: `ARCHITECTURE.md` §6 认证与授权

- [x] OIDC 配置和回调（简化版：Session Cookie）
  > PRD 参考: `PRD_Chorus.md` §7.4 认证流程
  > 架构参考: `ARCHITECTURE.md` §6.1 人类认证（OIDC + PKCE）
- [x] API Key 验证中间件
  > 架构参考: `ARCHITECTURE.md` §6.2 Agent 认证（API Key）
- [x] 获取当前用户/Agent

#### M1.3 Projects API ✅
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Project
> 设计参考: `design.pen` - "Chorus - Projects", "Chorus - New Project", "Chorus - Project Overview"

- [x] GET /api/projects - 项目列表
- [x] POST /api/projects - 创建项目
- [x] GET /api/projects/[id] - 项目详情
- [x] PATCH /api/projects/[id] - 更新项目
- [x] DELETE /api/projects/[id] - 删除项目

#### M1.4 Ideas API ✅
> PRD 参考: `PRD_Chorus.md` §4.1 F5 Idea→Proposal→Document/Task 工作流
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Idea, §7.3 Idea 状态流转
> 设计参考: `design.pen` - "Chorus - Project Ideas", "Modal - Claim Assignment"

- [x] GET /api/projects/[id]/ideas - Ideas 列表
- [x] POST /api/projects/[id]/ideas - 创建 Idea
- [x] GET /api/ideas/[ideaId] - Idea 详情
- [x] PATCH /api/ideas/[ideaId] - 更新 Idea
- [x] POST /api/ideas/[ideaId]/claim - 认领 Idea
  > PRD 参考: `PRD_Chorus.md` §4.1 F5 认领规则、认领方式
  > 架构参考: `ARCHITECTURE.md` §7.3 Idea 状态流转
- [x] POST /api/ideas/[ideaId]/release - 放弃认领 Idea
- [x] DELETE /api/ideas/[ideaId] - 删除 Idea

#### M1.5 Documents API ✅
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Document
> 设计参考: `design.pen` - "Chorus - Documents List", "Chorus - Document Preview"

- [x] GET /api/projects/[id]/documents - Documents 列表
- [x] POST /api/projects/[id]/documents - 创建 Document
- [x] GET /api/documents/[docId] - Document 详情
- [x] PATCH /api/documents/[docId] - 更新 Document
- [x] DELETE /api/documents/[docId] - 删除 Document

#### M1.6 Tasks API ✅
> PRD 参考: `PRD_Chorus.md` §3.3.1 任务系统（六阶段工作流、认领规则）
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Task, §7.2 任务状态流转
> 设计参考: `design.pen` - "Chorus - Project Tasks (Kanban)", "Task Detail Panel", "Modal - Claim Task"

- [x] GET /api/projects/[id]/tasks - Tasks 列表
- [x] POST /api/projects/[id]/tasks - 创建 Task
- [x] GET /api/tasks/[taskId] - Task 详情
- [x] PATCH /api/tasks/[taskId] - 更新 Task（状态、分配）
  > PRD 参考: Task 状态流转 open→assigned→in_progress→to_verify→done→closed
  > 架构参考: `ARCHITECTURE.md` §7.2 任务状态流转图
- [x] POST /api/tasks/[taskId]/claim - 认领 Task
  > PRD 参考: `PRD_Chorus.md` §3.3.1 认领方式（Agent 自己认领 / Human Assign）
- [x] POST /api/tasks/[taskId]/release - 放弃认领 Task
- [x] DELETE /api/tasks/[taskId] - 删除 Task

#### M1.7 Proposals API ✅
> PRD 参考: `PRD_Chorus.md` §4.1 F5 Proposal 的本质（输入→输出模型）
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Proposal, §7.4 提议审批流程
> 设计参考: `design.pen` - "Chorus - Project Proposals", "Chorus - Proposal Output (PRD)", "Chorus - Proposal Output (Tasks)", "Chorus - Proposal Output (Document Diff)"

- [x] GET /api/projects/[id]/proposals - Proposals 列表
- [x] POST /api/projects/[id]/proposals - 创建 Proposal（PM 专属）
- [x] GET /api/proposals/[propId] - Proposal 详情
- [x] POST /api/proposals/[propId]/approve - 审批通过 Proposal（Human 专属）
  > 架构参考: `ARCHITECTURE.md` §7.4 提议审批流程
- [x] POST /api/proposals/[propId]/reject - 拒绝 Proposal（Human 专属）

#### M1.8 Comments API ✅
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Comment（多态关联）

- [x] GET /api/comments?targetType=&targetId= - 获取评论
- [x] POST /api/comments - 添加评论

#### M1.9 Activity API ✅
> PRD 参考: `PRD_Chorus.md` §3.3.3 通知与协调
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Activity

- [x] GET /api/projects/[id]/activity - 项目活动流
- [x] POST /api/activity - 记录活动（内部）

#### M1.10 Agents API ✅
> PRD 参考: `PRD_Chorus.md` §4.1 F5.5 Agent 管理页面
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - Agent
> 设计参考: `design.pen` - "Chorus - All Agents"

- [x] GET /api/agents - Agent 列表
- [x] POST /api/agents - 创建 Agent（Human 专属）
- [x] GET /api/agents/[id] - Agent 详情
- [x] PATCH /api/agents/[id] - 更新 Agent
- [x] DELETE /api/agents/[id] - 删除 Agent

#### M1.11 API Keys API ✅
> PRD 参考: `PRD_Chorus.md` §4.1 F5.6 API Key 管理
> 架构参考: `ARCHITECTURE.md` §4.2 核心实体说明 - ApiKey, §9.1 API Key 安全
> 设计参考: `design.pen` - "Chorus - Settings", "Modal - Create API Key"

- [x] GET /api/api-keys - API Key 列表
- [x] POST /api/api-keys - 创建 API Key（Human 专属）
  > 架构参考: `ARCHITECTURE.md` §9.1 API Key 安全 - SHA-256 哈希存储
- [x] DELETE /api/api-keys/[id] - 撤销 API Key

#### M1.12 Agent 自助 API ✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表（chorus_get_my_assignments 查询逻辑）
> 架构参考: `ARCHITECTURE.md` §5.1 REST API - Agent 自助

- [x] GET /api/me/assignments - 获取自己认领的 Ideas + Tasks
  > 查询逻辑: assigneeId=当前Agent **或** assigneeId=当前Agent的Owner（人类分配给自己时）
- [x] GET /api/projects/[id]/available - 获取可认领的 Ideas + Tasks（status=open）

### 交付物
- 完整的 REST API
- API 文档（OpenAPI）
- 单元测试

---

## M2: MCP Server (Week 3) ✅ 完成

### 目标
实现 MCP HTTP 端点，让 Claude Code 可以调用 Chorus API。

> **PRD 参考**: `PRD_Chorus.md` §5.4 MCP Server 实现
> **架构参考**: `ARCHITECTURE.md` §5.2 MCP API

### 任务清单

#### M2.1 MCP 基础 ✅
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/mcp/

- [x] 安装 @modelcontextprotocol/sdk
- [x] 创建 MCP Server 实例
  > 代码位置: `src/mcp/server.ts`
- [x] 配置 HTTP Streamable Transport（WebStandardStreamableHTTPServerTransport）
- [x] 创建 /api/mcp 端点
  > 代码位置: `src/app/api/mcp/route.ts`

#### M2.2 公开工具（All Agents）✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表 - 读取（公开）
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - 公共工具

- [x] chorus_get_project - 获取项目背景信息
- [ ] chorus_query_knowledge - 统一查询知识库（Deferred: 使用单独工具替代）
- [x] chorus_get_ideas - 获取 Ideas 列表
- [x] chorus_get_documents - 获取 Documents 列表
- [x] chorus_get_document - 获取单个 Document 详情
- [x] chorus_get_proposals - 获取提议列表和状态
- [x] chorus_get_task - 获取任务详情和上下文
- [x] chorus_list_tasks - 列出任务
- [x] chorus_get_activity - 获取项目活动流
- [x] chorus_add_comment - 评论 Idea/Proposal/Task/Document
- [x] chorus_checkin - 心跳签到

#### M2.3 自助查询工具（All Agents）✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表 - 自助查询
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - 公共工具

- [x] chorus_get_my_assignments - 获取自己可操作的 Ideas + Tasks
  > 查询逻辑: 返回 assigneeType=agent AND assigneeId=当前AgentId **加上** assigneeType=user AND assigneeId=当前Agent的OwnerId
- [x] chorus_get_available_ideas - 获取可认领的 Ideas（status=open）
- [x] chorus_get_available_tasks - 获取可认领的 Tasks（status=open）

#### M2.4 PM Agent 专属工具 ✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表 - PM 专属
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - PM Agent 工具

- [x] chorus_pm_create_proposal - 创建提议（PRD/任务拆分/技术方案）
- [x] chorus_pm_create_document - 创建文档
- [x] chorus_pm_create_tasks - 批量创建任务
- [x] chorus_pm_update_document - 更新文档
- [x] chorus_claim_idea - 认领 Idea（open → assigned）
- [x] chorus_release_idea - 放弃认领 Idea（assigned → open）
- [x] chorus_update_idea_status - 更新 Idea 状态（仅认领者）

#### M2.5 Developer Agent 专属工具 ✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表 - Developer 专属
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - Developer Agent 工具

- [x] chorus_claim_task - 认领 Task（open → assigned）
- [x] chorus_release_task - 放弃认领 Task（assigned → open）
- [x] chorus_update_task - 更新任务状态（仅认领者）
- [x] chorus_submit_for_verify - 提交任务等待人类验证
- [x] chorus_report_work - 报告工作完成

#### M2.6 Admin Agent 专属工具 ✅
> PRD 参考: `PRD_Chorus.md` §5.4 MCP 工具列表 - Admin 专属
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - Admin Agent 工具

- [x] chorus_admin_create_project - 创建新项目
- [x] chorus_admin_create_idea - 创建 Idea（代理人类提出需求）
- [x] chorus_admin_approve_proposal - 审批 Proposal
- [x] chorus_admin_reject_proposal - 拒绝 Proposal
- [x] chorus_admin_verify_task - 验证 Task（to_verify → done）
- [x] chorus_admin_reopen_task - 重新打开 Task
- [x] chorus_admin_close_task - 关闭 Task
- [x] chorus_admin_close_idea - 关闭 Idea
- [x] chorus_admin_delete_idea - 删除 Idea
- [x] chorus_admin_delete_task - 删除 Task
- [x] chorus_admin_delete_document - 删除 Document

#### M2.7 权限验证 ✅
> 架构参考: `ARCHITECTURE.md` §6.3 权限模型

- [x] API Key 解析
- [x] 角色验证（PM/Developer/Admin）
- [x] 权限检查中间件（内置于 createMcpServer）
  > 代码位置: `src/mcp/server.ts` (角色基础工具注册)

### 交付物
- 可用的 MCP Server
- Claude Code 配置示例
- 工具测试脚本

---

## M2.5: Super Admin 认证 (Week 3) ✅ 完成

### 目标
实现 Super Admin 登录和 Company 管理，作为多租户系统的 Bootstrap 入口。

> **PRD 参考**: `PRD_Chorus.md` §4.2.1 Bootstrap 方案, §7.4 Super Admin 认证
> **架构参考**: `ARCHITECTURE.md` §6.1.1 Super Admin 认证

### 环境变量

```bash
# Super Admin 配置（.env）
SUPER_ADMIN_EMAIL="admin@chorus.dev"
# 注意：bcrypt hash 中的 $ 需要转义
SUPER_ADMIN_PASSWORD_HASH='\$2b\$10\$...'
```

生成密码哈希：
```bash
node -e "require('bcrypt').hash('your-password', 10).then(console.log)"
```

### 任务清单

#### M2.5.1 类型定义 ✅
- [x] 创建 `src/types/admin.ts` - CompanyListItem, CompanyDetail, IdentifyResponse
- [x] 更新 `src/types/auth.ts` - 添加 SuperAdminAuthContext, ActorType

#### M2.5.2 认证库 ✅
> 代码位置: `src/lib/super-admin.ts`

- [x] `isSuperAdminEmail(email)` - 检查是否是 Super Admin 邮箱
- [x] `verifySuperAdminPassword(password)` - bcrypt 密码验证
- [x] `createAdminToken()` - 创建 JWT Token
- [x] `verifyAdminToken(token)` - 验证 JWT Token
- [x] `getSuperAdminFromRequest(request)` - 从 Cookie 获取认证上下文
- [x] `setAdminCookie() / clearAdminCookie()` - Cookie 管理

#### M2.5.3 Company 服务 ✅
> 代码位置: `src/services/company.service.ts`

- [x] `listCompanies({ skip, take })` - 分页列表
- [x] `getCompanyByUuid(uuid)` - 获取详情
- [x] `getCompanyByEmailDomain(email)` - 按邮箱域名查找
- [x] `createCompany(data)` - 创建 Company
- [x] `updateCompany(id, data)` - 更新 Company（含 OIDC 配置）
- [x] `deleteCompany(id)` - 删除 Company（级联清理）
- [x] `isEmailDomainTaken(domain)` - 邮箱域名唯一性检查

#### M2.5.4 API 路由 ✅

| 路由 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/auth/identify` | POST | 邮箱识别（super_admin/oidc/not_found） | ✅ |
| `/api/admin/login` | POST | Super Admin 密码登录 | ✅ |
| `/api/admin/session` | GET | 会话检查 | ✅ |
| `/api/admin/session` | DELETE | 登出 | ✅ |
| `/api/admin/companies` | GET | Company 列表 | ✅ |
| `/api/admin/companies` | POST | 创建 Company | ✅ |
| `/api/admin/companies/[uuid]` | GET | Company 详情 | ✅ |
| `/api/admin/companies/[uuid]` | PATCH | 更新 Company | ✅ |
| `/api/admin/companies/[uuid]` | DELETE | 删除 Company | ✅ |

#### M2.5.5 UI 组件 ✅

shadcn 组件：
- [x] `src/components/ui/input.tsx`
- [x] `src/components/ui/label.tsx`
- [x] `src/components/ui/table.tsx`
- [x] `src/components/ui/badge.tsx`

#### M2.5.6 页面 ✅

| 页面 | 路径 | 描述 | 状态 |
|------|------|------|------|
| 登录 | `/login` | 邮箱输入页 | ✅ |
| Admin 登录 | `/login/admin` | Super Admin 密码页 | ✅ |
| Admin 布局 | `/admin/layout.tsx` | 认证检查 + 侧边栏 | ✅ |
| Admin Dashboard | `/admin` | 统计卡片 + 快捷操作 | ✅ |
| Company 列表 | `/admin/companies` | 表格 + CRUD 操作 | ✅ |
| 新建 Company | `/admin/companies/new` | 创建表单 | ✅ |
| Company 详情 | `/admin/companies/[uuid]` | 详情/编辑/OIDC 配置 | ✅ |

#### M2.5.7 验证 ✅

- [x] API 测试通过
  - [x] `/api/auth/identify` - Super Admin 邮箱识别
  - [x] `/api/admin/login` - 密码登录
  - [x] `/api/admin/session` - 会话检查
  - [x] `/api/admin/companies` - CRUD 操作
- [x] 登录页面渲染正常
- [x] 完整 UI 流程测试（手动验证）
- [x] Company OIDC 配置验证

### 交付物
- Super Admin 登录流程
- Company 管理 CRUD
- OIDC 配置管理
- 多租户 Bootstrap 入口

---

## M3: Web UI (Week 4) 🔄 进行中

### 目标
实现核心页面的 Web 界面。

> **架构参考**: `ARCHITECTURE.md` §3.2 目录结构 - src/app/, src/components/
> **设计参考**: `docs/design.pen` 包含所有页面设计稿

### 整体进度: 85%

**已完成**:
- ✅ Server Components + Server Actions 架构重构
- ✅ i18n 国际化（中英文）
- ✅ Stateful URL 路径重构 (`/projects/[uuid]/...`)
- ✅ 基础页面渲染和数据展示
- ✅ 项目创建时文档上传（.md 文件）
- ✅ Idea 创建表单（含附件上传）
- ✅ Assign Modal（分配给自己/其他用户/特定 Agent）
- ✅ Task 验证按钮（To Verify → Done）
- ✅ Kanban 拖拽功能（@hello-pangea/dnd）
- ✅ shadcn RadioGroup 组件

**待完成**:
- ⏳ Dashboard 跨项目统计
- ⏳ Knowledge 统一搜索
- ⏳ Document Diff 视图

### 任务清单

#### M3.1 布局和导航 🔄 部分完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/components/layout/
> 设计参考: `design.pen` 所有页面的 Sidebar 组件

- [x] 全局布局（侧边栏 + 主内容）
- [x] 项目导航（通过 URL `/projects/[uuid]/...`）
- [ ] **项目切换器下拉菜单** - PRD §3.2 Dashboard 设计
- [ ] **用户菜单完善**（当前仅显示邮箱，缺少下拉菜单）

#### M3.2 Dashboard ⏳ 未完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/app/page.tsx
> PRD 参考: `PRD_Chorus.md` §3.2 Dashboard

- [ ] **跨项目统计卡片**（总 Tasks、总 Ideas、待审批 Proposals）
- [ ] **最近活动**（跨项目活动流）
- [ ] **快捷入口**（最近访问项目、待处理事项）

**当前状态**: Dashboard 直接重定向到 /projects 列表页

#### M3.3 Projects ✅ 完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/app/projects/
> 设计参考: `design.pen` - "Chorus - Projects", "Chorus - New Project", "Chorus - Project Overview"

- [x] 项目列表页 (Server Component)
- [x] 项目创建表单 (Server Actions)
- [x] 文档上传功能（.md 文件，自动识别类型：PRD/技术设计/ADR）
  > 文件: `src/app/(dashboard)/projects/new/page.tsx`
- [x] Project Overview 页

#### M3.4 Ideas ✅ 完成
> PRD 参考: `PRD_Chorus.md` §4.1 F5 Idea 六阶段状态、认领方式
> 架构参考: `ARCHITECTURE.md` §7.3 Idea 状态流转
> 设计参考: `design.pen` - "Chorus - Project Ideas", "Modal - Claim Assignment"

- [x] Ideas 列表页 (Server Component)
  - [x] 显示状态标签（Open/Assigned/In Progress 等）
  - [x] Open 状态显示 "Assign" 按钮
- [x] Idea 创建表单（文本 + 附件上传）
  > 文件: `src/app/(dashboard)/projects/[uuid]/ideas/idea-create-form.tsx`
- [x] Assign 模态框（shadcn RadioGroup）
  > 文件: `src/components/assign-modal.tsx`
  - [x] "Assign to myself"（所有我的 Agent 都能处理）
  - [x] "Assign to another user"（其他公司用户）
  - [x] "Assign to specific Agent"（PM Agents 列表）
- [x] Idea 详情视图 (Server Component)

#### M3.5 Knowledge ⏳ 未完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/app/projects/[id]/knowledge/
> PRD 参考: `PRD_Chorus.md` §3.3.2 知识库

- [ ] **统一搜索界面**
- [ ] **搜索结果展示**（Ideas、Documents、Tasks、Proposals）
- [ ] **搜索过滤器**（类型、状态、时间范围）

**当前状态**: Knowledge 页面不存在

#### M3.6 Documents 🔄 部分完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/components/document/
> 设计参考: `design.pen` - "Chorus - Documents List", "Chorus - Document Preview"

- [x] Documents 列表页 (Server Component)
- [x] Document 详情/预览页 (Server Component)
- [ ] **Document 编辑器**（Markdown 编辑）
  > PRD 参考: `PRD_Chorus.md` §4.1 F5 Document 管理
- [ ] **Document 版本历史**

#### M3.7 Proposals 🔄 部分完成
> PRD 参考: `PRD_Chorus.md` §4.1 F5 Proposal 输入输出模型
> 架构参考: `ARCHITECTURE.md` §7.4 提议审批流程, §3.2 目录结构 - src/components/proposal/
> 设计参考: `design.pen` - "Chorus - Project Proposals", "Chorus - Proposal Output (PRD)", "Chorus - Proposal Output (Tasks)", "Chorus - Proposal Output (Document Diff)"

- [x] Proposals 列表页 (Server Component)
- [x] Proposal 详情页 (Server Component)
  - [x] 显示输入来源（Ideas 或 Document）
  - [x] 显示输出预览（Document 草稿或 Task 列表）
- [x] 审批按钮（批准/拒绝）(Server Actions)
- [ ] **Document Diff 视图**（对比修改前后）
  > 设计参考: `design.pen` - "Chorus - Proposal Output (Document Diff)"
- [ ] **修改请求功能**（返回修改）

#### M3.8 Tasks (Kanban) ✅ 完成
> PRD 参考: `PRD_Chorus.md` §3.3.1 任务系统（六阶段工作流、认领规则）
> 架构参考: `ARCHITECTURE.md` §7.2 任务状态流转, §3.2 目录结构 - src/components/kanban/
> 设计参考: `design.pen` - "Chorus - Project Tasks (Kanban)", "Task Detail Panel", "Modal - Claim Task"

- [x] 四列看板布局（Todo/In Progress/To Verify/Done）
  - [x] Todo 列包含 Open + Assigned 状态
  - [x] Open 状态卡片显示 "Assign" 按钮样式
- [x] 拖拽移动功能（@hello-pangea/dnd）
  > 文件: `src/app/(dashboard)/projects/[uuid]/tasks/kanban-board.tsx`
  > Server Action: `src/app/(dashboard)/projects/[uuid]/tasks/actions.ts`
- [x] 任务卡片
  - [x] 显示状态标签
  - [x] 显示 Assigned to 信息
  - [x] 显示 Story Points (Agent Hours)
- [x] 任务详情页（独立页面）
- [ ] **任务详情侧边栏**（PRD 设计为 slide-out panel，暂用独立页面）
- [x] Assign 模态框（shadcn RadioGroup）
  > 文件: `src/components/assign-modal.tsx`（复用 Ideas 的模态框）
  - [x] "Assign to myself"
  - [x] "Assign to another user"
  - [x] "Assign to specific Agent"（Developer Agents 列表）
- [x] 验证按钮（To Verify → Done，Human 专属）
  > 文件: `src/app/(dashboard)/projects/[uuid]/tasks/[taskUuid]/task-actions.tsx`
- [x] 状态更新（通过拖拽或 TaskStatusProgress 组件）

#### M3.9 Activity 🔄 部分完成
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/components/activity/
> PRD 参考: `PRD_Chorus.md` §3.3.3 活动流

- [x] 活动流列表 (Server Component)
- [ ] **活动筛选**（按类型、按参与者）
- [ ] **活动详情展开**

#### M3.10 Agents ⏳ 未完成（合并到 Settings）
> PRD 参考: `PRD_Chorus.md` §4.1 F5.5 Agent 管理页面
> 架构参考: `ARCHITECTURE.md` §3.2 目录结构 - src/app/agents/
> 设计参考: `design.pen` - "Chorus - All Agents"

- [ ] **独立 Agent 列表页**
  > 当前 Agent 管理合并到 Settings 页面
- [ ] **Agent 创建表单**（独立页面）
- [ ] **Agent 详情页**（活动历史、统计）
- [x] 角色标签展示（PM / Developer / Admin）（在 Settings 中）

**当前状态**: Agent 管理功能合并在 Settings 页面的 API Key 管理中

#### M3.11 Settings ✅ 完成
> PRD 参考: `PRD_Chorus.md` §4.1 F5.6 API Key 管理
> 架构参考: `ARCHITECTURE.md` §9.1 API Key 安全
> 设计参考: `design.pen` - "Chorus - Settings", "Modal - Create API Key"

- [x] API Key 列表 (Server Actions)
- [x] 创建 API Key 模态框
- [x] 角色选择（可多选：PM / Developer / Admin）
- [x] Persona 编辑（预设模板 + 自定义）
- [x] Admin 角色危险警告
- [x] Key 复制/撤销
- [x] 语言切换（i18n）

#### M3.12 i18n 国际化 ✅ 完成
> 新增功能

- [x] next-intl 集成
- [x] 中文/英文切换
- [x] 所有页面文案国际化

### 交付物
- [ ] 完整的 Web UI
- [ ] 响应式设计
- [ ] 组件库

---

## M4: Skill 文件 (Week 5) ⏳ 未开始

### 目标
编写 Agent 使用平台的指导文件。

> **PRD 参考**: `PRD_Chorus.md` §3.4 Claude Code 集成方案
> **架构参考**: `ARCHITECTURE.md` §3.2 目录结构 - skill/

### 当前状态: 0% - 尚未创建任何 Skill 文件

### 任务清单

#### M4.1 PM Agent Skill ⏳
> PRD 参考: `PRD_Chorus.md` §3.3.4 PM Agent 支持
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - PM Agent 工具

- [ ] **skill/pm/SKILL.md** - API 使用说明
  - 描述所有 PM 专属 MCP 工具
  - 描述 Idea 认领流程
  - 描述 Proposal 创建最佳实践
- [ ] **skill/pm/HEARTBEAT.md** - 定期检查清单
  - 检查新的 Open Ideas
  - 检查 Proposal 审批状态
  - 分析项目进度
- [ ] 提议创建最佳实践示例

#### M4.2 Developer Agent Skill ⏳
> PRD 参考: `PRD_Chorus.md` §3.3.4 Developer Agent 专属工具
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - Developer Agent 工具

- [ ] **skill/developer/SKILL.md** - API 使用说明
  - 描述所有 Developer 专属 MCP 工具
  - 描述 Task 认领流程
  - 描述任务执行和报告流程
- [ ] **skill/developer/HEARTBEAT.md** - 定期检查清单
  - 检查分配给自己的任务
  - 检查 Open 任务（可认领）
  - 报告工作进度
- [ ] 任务执行最佳实践示例

#### M4.3 Admin Agent Skill ⏳
> PRD 参考: `PRD_Chorus.md` §3.3.4 Admin Agent 角色
> 架构参考: `ARCHITECTURE.md` §5.2 MCP API - Admin Agent 工具

- [ ] **skill/admin/SKILL.md** - 审批/验证操作指南
  - 描述所有 Admin 专属 MCP 工具
  - Proposal 审批流程和标准
  - Task 验证流程和标准
  - 危险操作警告
- [ ] **skill/admin/HEARTBEAT.md** - 定期检查清单
  - 检查待审批 Proposals
  - 检查待验证 Tasks

#### M4.4 CLAUDE.md 模板 ⏳
- [ ] **项目级配置模板**
- [ ] **心跳触发说明**
  > PRD 参考: `PRD_Chorus.md` §3.4 心跳实现思路
- [ ] **MCP Server 配置示例**

### 交付物
- 完整的 Skill 文件
- CLAUDE.md 模板
- 使用文档

---

## M5: 联调测试 (Week 6) ⏳ 未开始

### 目标
端到端验证，确保所有功能可用。

> **架构参考**: `ARCHITECTURE.md` §7 核心流程

### 当前状态: 0% - 尚未开始系统测试

### 任务清单

#### M5.1 集成测试 ⏳
> 架构参考: `ARCHITECTURE.md` §6.3 权限模型

- [ ] **API 集成测试**
- [ ] **MCP 工具测试**
- [ ] **权限测试**
  - 测试 PM 专属工具权限
  - 测试 Developer 专属工具权限
  - 测试 Admin 专属工具权限
  - 测试认领者权限（只有认领者可更新状态）

#### M5.2 端到端测试 ⏳
> PRD 参考: `PRD_Chorus.md` §4.1 F5 详细工作流
> 架构参考: `ARCHITECTURE.md` §7.1 Reversed Conversation 工作流, §7.2 任务状态流转, §7.3 Idea 状态流转

- [ ] **PM Agent 工作流测试**
  - Idea 认领 → Proposal 创建 → 等待审批
- [ ] **Developer Agent 工作流测试**
  - Task 认领 → 执行 → 提交验证 → 报告完成
- [ ] **Human 审批工作流测试**
  - Proposal 审批 → Document/Task 自动创建
  - Task 验证 → Done
- [ ] **认领分配测试**
  - Human "Assign to myself" → 所有 Agent 可见
  - Human "Assign to specific Agent" → 仅该 Agent 可见

#### M5.3 Demo 准备 ⏳
- [ ] **演示数据种子**
- [ ] **演示脚本**
- [ ] **录屏/截图**

#### M5.4 文档完善 ⏳
- [ ] **README 更新**
- [ ] **部署文档**
  > 架构参考: `ARCHITECTURE.md` §8 部署架构
- [ ] **API 文档**

### 交付物
- 通过所有测试
- Demo 演示
- 完整文档

---

## 依赖关系

```
M0 (项目骨架) ✅
 ↓
M1 (后端 API) ✅
 ↓
M2 (MCP Server) ✅
 ↓
M2.5 (Super Admin) ✅
 ↓
M3 (Web UI) 🔄 ← 当前进度（60%）
 ↓
M4 (Skill 文件) ⏳
 ↓
M5 (联调测试) ⏳
```

---

## M3 待完成功能优先级

### P0 - 核心交互（必须完成）✅ 全部完成

| 功能 | 页面 | 复杂度 | 状态 |
|-----|------|--------|------|
| Idea 创建表单 | Ideas | 中 | ✅ 完成 |
| Assign 模态框 | Ideas/Tasks | 中 | ✅ 完成（shadcn RadioGroup） |
| Task 验证按钮 | Task Detail | 低 | ✅ 完成 |
| Task 状态更新 | Task Detail | 低 | ✅ 完成 |
| Document 上传 | New Project | 中 | ✅ 完成（.md 文件上传） |

### P1 - 重要功能

| 功能 | 页面 | 复杂度 | 状态 |
|-----|------|--------|------|
| Kanban 拖拽 | Tasks | 高 | ✅ 完成（@hello-pangea/dnd） |
| Knowledge 搜索 | Knowledge | 中 | ⏳ 待完成 |
| Document 编辑 | Documents | 高 | ✅ 已有（Server Actions） |
| Dashboard 统计 | Dashboard | 中 | ⏳ 待完成 |

### P2 - 体验优化

| 功能 | 页面 | 复杂度 | 状态 |
|-----|------|--------|------|
| Task 侧边栏 | Tasks | 中 | ⏳ 暂用独立页面 |
| Document Diff | Proposals | 高 | ⏳ 待完成 |
| Activity 筛选 | Activity | 低 | ⏳ 待完成 |
| Agent 独立页 | Agents | 中 | ⏳ 合并到 Settings |

---

## 设计稿索引

| 页面名称 | 设计稿节点 | 实现状态 |
|---------|-----------|---------|
| Login - Email Input | - | ✅ |
| Super Admin - Password Login | - | ✅ |
| Super Admin - Companies | - | ✅ |
| Chorus - Projects | f2Faj | ✅ |
| Chorus - New Project | MsJV4 | ✅ |
| Chorus - Project Overview | QQV0z | ✅ |
| Chorus - Project Ideas | rNq1h | ✅ 完成（创建表单 + Assign 模态框） |
| Chorus - Project Proposals | XlN0Q | ✅ |
| Chorus - Proposal Output (PRD) | dF5OI | ✅ |
| Chorus - Proposal Output (Tasks) | mlAGV | ✅ |
| Chorus - Proposal Output (Document Diff) | aop75 | ⏳ 未实现 |
| Chorus - Project Tasks (Kanban) | 511Kf | ✅ 完成（拖拽 + Assign 模态框） |
| Task Detail Panel | 1wqLo | ✅ 完成（独立页面 + 验证按钮） |
| Chorus - Documents List | q2i2n | ✅ |
| Chorus - Document Preview | B1x5H | ✅ |
| Chorus - All Agents | 3xsuC | ⏳ 合并到 Settings |
| Chorus - Settings | WU9KX | ✅ |
| Modal - Create API Key | BjBrG | ✅ |
| Modal - Assign (Idea) | VobiB | ✅ 完成（AssignModal） |
| Modal - Assign (Task) | QAR54 | ✅ 完成（AssignModal 复用） |

---

## 风险和缓解

| 风险 | 概率 | 缓解 |
|-----|------|------|
| Prisma schema 变更频繁 | 高 | ✅ 已完成数据模型设计评审 |
| MCP SDK 不熟悉 | 中 | ✅ 已完成 MCP Server 实现 |
| UI 工作量大 | 高 | 🔄 使用 shadcn/ui 加速，Server Actions 简化 |
| 认证复杂度 | 中 | ✅ MVP 使用简化 OIDC 方案 |
| 认领逻辑复杂 | 中 | 🔄 基础认领完成，模态框待实现 |
| 拖拽功能复杂 | 高 | ⏳ 需要评估 dnd-kit 集成工作量 |
