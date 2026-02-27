# Changelog

## [0.1.1] - 2026-02-27

### Added

- **Proposal Validation Checklist**: Pre-submission validation with 12 checks (5 errors, 5 warnings, 2 info) across document completeness, task quality, and DAG structure. New `chorus_pm_validate_proposal` MCP tool for PM agents. Collapsible frontend checklist with error/warning count badges and full i18n support (ICU plurals).
- **`chorus_list_projects` MCP tool**: List all projects regardless of project group — available to all authenticated agents.
- **`ungroupedCount` in project groups**: `chorus_get_project_groups` now returns the count of ungrouped projects.
- **Plugin Bash 3.2 compatibility**: Fixed `${VAR,,}` Bash 4+ syntax in hook scripts for macOS `/bin/bash` 3.2 compatibility. Added `test-syntax.sh` script to verify plugin hook compatibility.

### Fixed

- **Project group completion rate always showing 0%**: `getGroupStats` was hardcoding `completedTasks: 0` instead of summing from each project. Group dashboard also now counts both "done" and "closed" tasks.
- **Tasks page performance storm**: Batch DB queries reduce ~82 queries to ~4 for task listing. Added `batchGetActorNames()`, `batchFormatCreatedBy()`, `formatTaskResponsesBatch()`, and `batchGetWorkerCountsForTasks()`. SSE throttled to 3s + 1s debounce to limit `router.refresh()` during active agent work.

### Plugin

- Bumped Chorus Plugin from v0.1.7 to v0.1.9.

---

## [0.1.0] - 2026-02-26

First public release of Chorus — an AI Agent & Human collaboration platform implementing the [AI-DLC (AI-Driven Development Lifecycle)](docs/PRD_Chorus.md) methodology.

**Core philosophy: "Reversed Conversation" — AI proposes, humans verify.**

### Zero Context Injection

Agents automatically know "who I am" and "what to do" — no manual onboarding.

- Agent persona with predefined role, expertise, and work style
- `chorus_checkin` returns pending assignments, project context, and notifications
- Chorus Plugin for Claude Code auto-injects session context on sub-agent spawn
- Downloadable Skill documentation for agent self-onboarding

### AI-DLC Workflow

Complete closed-loop pipeline from idea to delivery:

```
Idea → Elaboration → Proposal → [Document + Task DAG] → Execute → Verify → Done
```

- **Ideas**: Capture requirements, assign to PM agents or humans
- **Requirements Elaboration**: Structured multi-round Q&A with stakeholders before proposal creation
- **Proposals**: PM Agent drafts PRD + task breakdown → human reviews → approve/reject/close
- **Documents**: PRD, tech design, ADR, spec, guide — versioned Markdown with proposal linkage
- **Task DAG**: Directed acyclic graph with dependency management, cycle detection, and topological ordering
- **Task Lifecycle**: open → assigned → in_progress → to_verify → done with optimistic locking on claim/release
- **Agent Hours**: New effort metric replacing traditional story points — 1 AH = 1 Agent working for 1 hour

### Multi-Agent Awareness

All agent work is visible in real-time — no more isolated sessions.

- **Agent Sessions**: Track sub-agent swarm activity with checkin/checkout, heartbeat, and auto-expiry
- **Activity Stream**: Audit log of all actions with session attribution for full traceability
- **SSE Real-time Updates**: Live Kanban, Ideas, and Proposals sync across all connected clients
- **Pixel Art Workers**: Animated typing indicators on Kanban cards showing which agents are actively working
- **@Mentions**: Tag users and agents in comments with notification delivery
- **Work Reports**: Progress updates stored as comments for team-wide visibility

### Web UI

- Project dashboard with grouped projects, completion rates, and aggregated stats
- Kanban board with drag-and-drop task management
- Interactive DAG visualization ([@xyflow/react](https://reactflow.dev/) + dagre)
- Proposal detail with document/task draft review workflow
- Rich Markdown rendering in Ideas, Tasks, and Proposals
- Full i18n support (English and Chinese)

### MCP Server

40+ tools across three agent roles via HTTP Streamable Transport:

| Role | Tools | Responsibility |
|------|-------|---------------|
| PM Agent | `chorus_pm_*` | Analyze ideas, create proposals, manage documents, assign tasks |
| Developer Agent | `chorus_*_task`, `chorus_report_work` | Claim tasks, report progress, submit for verification |
| Admin Agent | `chorus_admin_*` | Create projects/ideas, approve proposals, verify tasks |

Compatible with Claude Code, Cursor, Kiro, and any MCP client.

### Auth

- OIDC authentication for human users
- API Key authentication (`cho_` prefix, SHA-256 hashed) for agents
- Default username/password auth mode for quick setup
- Multi-tenant company isolation

### Deployment

- Docker image with standalone Next.js build (multi-arch: amd64/arm64)
- Docker Compose full-stack setup (app + PostgreSQL + Redis)
- AWS CDK infrastructure-as-code package
- `.env.example` for all required configuration
