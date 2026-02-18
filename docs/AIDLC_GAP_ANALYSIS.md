# AI-DLC Gap Analysis — Chorus vs Standard AI-DLC

> Generated: 2026-02-18
> Scope: Inception + Construction phases (Operations excluded from current scope)

## Background

AI-DLC (AI-Driven Development Lifecycle) is a methodology framework proposed by AWS (2025) that reimagines software development to treat AI Agents as active collaborators. Core principles:

- **Reversed Conversation**: AI proposes, humans verify (not human command → AI execute)
- **Agent Hours**: New work measurement unit replacing person-days
- **Bolt Cycles**: Hour/day-level iterations replacing week-level Sprints
- **Context Continuity**: Zero-cost context injection for Agents at session start
- **Mob Elaboration**: Real-time team verification of AI proposals

Chorus implements the AI-DLC pipeline: Idea → Proposal → Document + Task → Execute → Verify → Done.

## What Chorus Does Well

- **Reversed Conversation**: Well-implemented in Proposal approval flow (PM proposes, Admin verifies)
- **Idea creation by AI**: Admin-role Agents can create Ideas, enabling feedback loops
- **Context injection**: Chorus Plugin auto-injects context at CC session start via hooks
- **Task DAG**: Dependency modeling with cycle detection, rendered with @xyflow/react + dagre
- **Session observability**: Swarm mode with per-sub-agent sessions, visible on Kanban/Task Detail
- **Multi-tenant, UUID-first architecture**: Production-grade engineering quality
- **Role-based MCP tools**: 50+ tools across Public/Session/Developer/PM/Admin scopes
- **Activity stream**: All significant actions logged with session attribution

## Gap Analysis

### P0 — Critical for "Management Tool" Status

#### 1. Task Auto-Scheduling (DAG Scheduler)

**Current state**: ⚠️ Partially addressed. `chorus_get_unblocked_tasks` MCP tool now provides on-demand discovery of tasks whose dependencies are all resolved. The Chorus Plugin's SubagentStop hook automatically calls this tool when a sub-agent finishes, surfacing newly unblocked tasks to the Team Lead.

**What's implemented**:
- `getUnblockedTasks()` service method: queries tasks with status open/assigned where all dependencies are done/to_verify
- `chorus_get_unblocked_tasks` public MCP tool: available to all agents for on-demand scheduling queries
- Plugin SubagentStop hook integration: when a sub-agent exits, the hook fetches unblocked tasks and includes them in the Team Lead's context

**Still missing**:
- Automatic status transition (auto-assign unblocked tasks to available agents)
- Event-driven push: proactive notification when a task becomes unblocked (currently requires poll or SubagentStop trigger)
- Real-time WebSocket/SSE notification to UI dashboard

**Impact**: Team Lead no longer needs to manually cross-reference `list_tasks` with the dependency graph. The SubagentStop trigger provides just-in-time scheduling information. However, fully autonomous scheduling (no human in the loop) still requires event-driven push.

**Implementation scope**: Next step — add event listener on task status change to proactively notify agents.

#### 2. Notification & Event Push

**Current state**: All state changes write to Activity stream only. No push mechanism.

**Missing behavior**:
- Proposal submitted → push to Admins with approval permissions
- Task submitted for verify → push to Admin
- Task dependency unblocked → push to assigned Agent
- Comment @mention → push to mentioned role
- Session inactive/expired → push to Team Lead

**Delivery channels needed** (at least one):
- Webhook (for external integrations)
- MCP notification (for connected Agents)
- UI real-time (WebSocket/SSE for human dashboard)

**Impact**: Without notifications, all collaboration is poll-based. Mob Elaboration cannot work. Bolt Cycle latency degrades from seconds to minutes/hours.

**Implementation scope**: Event bus + webhook system + optional WebSocket for UI.

### P1 — Important for AI-DLC Alignment

#### 3. Execution Metrics (Agent Hours)

**Current state**: `storyPoints` field exists but unused. `report_work` logs text, not duration. Sessions have `createdAt`/`lastActiveAt` but no aggregation.

**Missing data**:
- Per-task execution wall time (in_progress → to_verify timestamp delta)
- Per-session active duration (cumulative heartbeat intervals)
- Project-level velocity (tasks/storyPoints completed per time unit)
- Agent-level efficiency comparison

**Impact**: Cannot evaluate AI ROI. Cannot do capacity planning. Cannot compare AI providers.

**Implementation scope**: Add timestamps to task status transitions + aggregation queries.

#### 4. Proposal Granular Review

**Current state**: Binary approve/reject for entire Proposal.

**Missing behavior**:
- Partial approval: "Approve tasks 1-3, revise task 4"
- Conditional approval: "Approved, but add this acceptance criterion"
- Per-draft review: Document drafts and task drafts reviewed separately
- Revision diff: Show what changed between revision rounds

**Impact**: Binary approval forces Admin to accept flawed plans or reject entirely. PM Agent cannot efficiently iterate on specific issues.

**Implementation scope**: Per-draft status + review comment threading on individual drafts.

#### 5. Session Auto-Expiry

**Current state**: Schema has `expiresAt` field. CLAUDE.md documents "30 min expiry / 1h inactive". No background job implements this.

**Missing behavior**:
- Periodic scan: active sessions with `lastActiveAt` > 1h → mark `inactive`
- Longer threshold → auto-close + checkout all active checkins
- Associated tasks still `in_progress` → flag for reassignment

**Impact**: Zombie sessions accumulate. Kanban shows false "active worker" badges. Humans make decisions based on stale observability data.

**Implementation scope**: Cron job or Next.js API route with scheduled invocation.

### P2 — Nice to Have

#### 6. Checkin Context Density

**Current state**: `chorus_checkin` returns persona + assignments + pending count. Plugin injects this at session start.

**Missing context** (would reduce Agent startup tool calls):
- Project status summary ("8 tasks: 5 done, 2 in_progress, 1 blocked")
- Recent key decisions ("Admin rejected Proposal X yesterday, reason: Y")
- Current blockers ("Task 3 blocked by Task 1, Task 1 assignee inactive 2h")
- Actionable suggestions ("You have 1 assigned task to start, 2 available to claim")

**Impact**: Agent still needs multiple tool calls after checkin to build full picture.

**Implementation scope**: Enrich `checkin` response with aggregated project state.

#### 7. Proposal State Machine Validation

**Current state**: Idea and Task have `isValidStatusTransition()`. Proposal does not.

**Impact**: API allows illegal state transitions (e.g., `approved` → `draft`).

**Implementation scope**: Add `PROPOSAL_STATUS_TRANSITIONS` constant + validation in service layer. Small change.

## Feature Inventory

| Feature | AI-DLC Standard | Chorus Status | Gap |
|---------|----------------|---------------|-----|
| Reversed Conversation | AI proposes, human verifies | ✅ Proposal approval flow | — |
| Agent Hours | Core measurement unit | ❌ Only storyPoints | P1 |
| Bolt Cycles | Hour/day iterations | ❌ No iteration concept | P2 (see notes below) |
| Context Continuity | Zero-cost context injection | ✅ Plugin + checkin | Could be denser (P2) |
| Mob Elaboration | Real-time team verification | ⚠️ Async comments only | Needs notifications (P0) |
| Task DAG | Dependency graph | ✅ Modeled + rendered | ⚠️ Scheduler partially done (query + plugin hook) |
| Feedback Loop | Ops → new Ideas | ✅ AI can create Ideas | — |
| Session Observability | Track active workers | ✅ Sessions + checkins | Needs auto-expiry (P1) |
| Parallel Execution | Multi-agent concurrent | ✅ Swarm mode + Plugin | ⚠️ Auto-dispatch via SubagentStop hook + MCP tool |
| Granular Review | Partial approval | ❌ Binary approve/reject | P1 |
| Notifications | Push on state change | ❌ Poll-only | P0 |
| Metrics/Reporting | Velocity, Agent Hours | ❌ No aggregation | P1 |

## Notes on Bolt Cycles

Bolt Cycles (short iterations replacing Sprints) are an AI-DLC concept, but Chorus currently has no iteration/milestone grouping. However:

- Bolt Cycles are more of a **process practice** than a **platform feature**
- Teams can practice Bolt-style short iterations using Projects as iteration containers
- The critical enabler for Bolt Cycles is **speed** (fast scheduling + fast feedback) — which maps to P0 items (scheduler + notifications)
- An explicit Bolt/Milestone entity could be added later as a P2 enhancement if teams need formal iteration tracking

Implementing P0 (scheduler + notifications) effectively enables Bolt-style velocity without requiring a dedicated Bolt entity.

## Recommended Implementation Order

1. **Task auto-scheduling** (P0) — Most impactful single feature. Transforms Chorus from record-keeper to orchestrator.
2. **Notification system** (P0) — Enables real-time collaboration. Start with webhook, extend to MCP notification.
3. **Session auto-expiry** (P1) — Quick win. Cron job + status update.
4. **Proposal state validation** (P2) — Quick win. Mirror Idea/Task pattern.
5. **Execution metrics** (P1) — Add timestamps to status transitions, build aggregation later.
6. **Proposal granular review** (P1) — Larger scope, design carefully.
7. **Checkin context density** (P2) — Incremental enrichment of checkin response.
