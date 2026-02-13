# Claude Code Agent Teams + Chorus Integration

## Overview

This guide explains how to run **Claude Code Agent Teams** (swarm mode) with Chorus for full work observability. In this setup, a Team Lead agent orchestrates multiple sub-agents, each working on Chorus tasks in parallel, with every action tracked through Chorus Sessions.

### Two-Layer Architecture

Claude Code Agent Teams and Chorus serve different purposes:

| Layer | System | Purpose |
|-------|--------|---------|
| **Orchestration** | Claude Code Agent Teams | Spawning sub-agents, internal task dispatch, inter-agent messaging |
| **Work Tracking** | Chorus | Task lifecycle (claim → in_progress → to_verify → done), session observability, activity stream |

```
┌─────────────────────────────────────────────────────────┐
│ Claude Code Agent Teams (Orchestration)                 │
│                                                         │
│  Team Lead ──spawn──> Sub-Agent A ──spawn──> Sub-Agent B│
│     │                    │                      │       │
│  TeamCreate           Task tool              Task tool  │
│  TaskCreate           SendMessage            SendMessage│
│  TaskList/Update                                        │
│  SendMessage                                            │
└───────┬──────────────────┬──────────────────────┬───────┘
        │                  │                      │
        ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│ Chorus (Work Tracking & Observability)                  │
│                                                         │
│  Session: "lead"    Session: "fe-worker"  Session: "be" │
│    │                  │                     │           │
│    │                  ├─ checkin → Task A    ├─ checkin  │
│    │                  ├─ update_task         │  → Task B │
│    │                  ├─ report_work         ├─ update   │
│    │                  └─ submit_for_verify   └─ report   │
│                                                         │
│  UI: Kanban badges, Task Detail workers, Activity stream│
└─────────────────────────────────────────────────────────┘
```

### Key Principle: One Session Per Worker

Every agent that works on Chorus tasks **must have its own separate Chorus Session**. This is a hard requirement — the UI relies on session checkins to show which worker is active on which task.

- Team Lead: creates all sessions upfront, passes session UUIDs to sub-agents
- Sub-Agents: each receives exactly one session UUID; uses it for all Chorus operations
- Never share a session between two sub-agents

---

## MCP Access for Sub-Agents

Sub-agents spawned via Claude Code's `Task` tool can access Chorus MCP tools **if the MCP server is configured at the project level** (in `.claude/settings.json` or `.mcp.json`). This is the recommended setup.

If MCP is configured at the user level (`~/.claude/settings.json`), sub-agents may not have access. In that case, move the Chorus MCP config to the project level:

```json
// .mcp.json (project root)
{
  "mcpServers": {
    "chorus": {
      "type": "streamable-http",
      "url": "<BASE_URL>/api/mcp",
      "headers": {
        "Authorization": "Bearer cho_xxxxxxxxxxxx"
      }
    }
  }
}
```

---

## Complete Workflow

### Phase 1: Team Lead — Plan & Prepare

The Team Lead starts by understanding the work and creating Chorus sessions.

```
# 1. Check in to Chorus
chorus_checkin()

# 2. Understand the project and available tasks
chorus_get_project({ projectUuid: "<project-uuid>" })
chorus_list_tasks({ projectUuid: "<project-uuid>", status: "assigned" })

# 3. Read task details to plan work distribution
chorus_get_task({ taskUuid: "<task-A-uuid>" })
chorus_get_task({ taskUuid: "<task-B-uuid>" })

# 4. Check for reusable sessions
chorus_list_sessions()

# 5. Create one session per sub-agent (or reopen closed ones)
chorus_create_session({ name: "frontend-worker", description: "Frontend component development" })
# → Returns { uuid: "session-fe-uuid" }

chorus_create_session({ name: "backend-worker", description: "Backend API development" })
# → Returns { uuid: "session-be-uuid" }
```

### Phase 2: Team Lead — Create Claude Code Team & Spawn Sub-Agents

Now use Claude Code's orchestration tools to create the team and dispatch work.

```python
# 1. Create a Claude Code team
TeamCreate({ team_name: "feature-x", description: "Implementing feature X" })

# 2. Create internal tasks for tracking
TaskCreate({ subject: "Frontend: build user form", description: "..." })
TaskCreate({ subject: "Backend: create API endpoints", description: "..." })

# 3. Spawn sub-agents via Task tool
#    CRITICAL: Pass Chorus task UUID + session UUID in the prompt
Task({
  subagent_type: "general-purpose",
  team_name: "feature-x",
  name: "frontend-worker",
  prompt: """
    You are a Developer Agent working with Chorus.

    Your Chorus session UUID: session-fe-uuid
    Your Chorus task UUID: task-A-uuid
    Project UUID: project-uuid

    IMPORTANT — Chorus workflow (do this FIRST before any coding):
    1. chorus_session_checkin_task({ sessionUuid: "session-fe-uuid", taskUuid: "task-A-uuid" })
    2. chorus_update_task({ taskUuid: "task-A-uuid", status: "in_progress", sessionUuid: "session-fe-uuid" })

    Then implement the frontend user form component...

    When done:
    3. chorus_report_work({ taskUuid: "task-A-uuid", report: "...", sessionUuid: "session-fe-uuid" })
    4. chorus_session_checkout_task({ sessionUuid: "session-fe-uuid", taskUuid: "task-A-uuid" })
    5. chorus_submit_for_verify({ taskUuid: "task-A-uuid", summary: "..." })
  """
})

Task({
  subagent_type: "general-purpose",
  team_name: "feature-x",
  name: "backend-worker",
  prompt: """
    You are a Developer Agent working with Chorus.

    Your Chorus session UUID: session-be-uuid
    Your Chorus task UUID: task-B-uuid
    Project UUID: project-uuid

    IMPORTANT — Chorus workflow (do this FIRST before any coding):
    1. chorus_session_checkin_task({ sessionUuid: "session-be-uuid", taskUuid: "task-B-uuid" })
    2. chorus_update_task({ taskUuid: "task-B-uuid", status: "in_progress", sessionUuid: "session-be-uuid" })

    Then implement the backend API endpoints...

    When done:
    3. chorus_report_work({ taskUuid: "task-B-uuid", report: "...", sessionUuid: "session-be-uuid" })
    4. chorus_session_checkout_task({ sessionUuid: "session-be-uuid", taskUuid: "task-B-uuid" })
    5. chorus_submit_for_verify({ taskUuid: "task-B-uuid", summary: "..." })
  """
})
```

**Critical details in the prompt:**
- **Session UUID** — the sub-agent's own Chorus session (created by team lead)
- **Task UUID(s)** — which Chorus tasks this sub-agent is responsible for
- **Chorus workflow steps** — explicit instructions for checkin, status updates, report, checkout, submit
- **Project UUID** — for querying project context if needed

### Phase 3: Sub-Agent — Execute Work

Each sub-agent follows this sequence autonomously:

```
# === Chorus Setup (FIRST, before any coding) ===

# 1. Checkin to task — makes you visible in the UI
chorus_session_checkin_task({
  sessionUuid: "<my-session-uuid>",
  taskUuid: "<my-task-uuid>"
})

# 2. Move task to in_progress
chorus_update_task({
  taskUuid: "<my-task-uuid>",
  status: "in_progress",
  sessionUuid: "<my-session-uuid>"
})

# === Do the actual work (coding, testing, etc.) ===
# ...write code, run tests, create commits...

# === Progress reporting (periodically during work) ===

# 3. Report progress (auto-heartbeats the session)
chorus_report_work({
  taskUuid: "<my-task-uuid>",
  report: "Completed user form component.\n- Files: src/components/UserForm.tsx\n- Commit: abc123",
  sessionUuid: "<my-session-uuid>"
})

# === Completion ===

# 4. Checkout from task
chorus_session_checkout_task({
  sessionUuid: "<my-session-uuid>",
  taskUuid: "<my-task-uuid>"
})

# 5. Submit for verification
chorus_submit_for_verify({
  taskUuid: "<my-task-uuid>",
  summary: "Implemented user form with validation.\nFiles: src/components/UserForm.tsx, tests/UserForm.test.tsx\nAll tests passing."
})

# 6. Notify team lead via Claude Code messaging
SendMessage({ type: "message", recipient: "team-lead", content: "Task complete", summary: "Frontend task done" })
```

### Phase 4: Team Lead — Monitor & Close

The Team Lead monitors until all Chorus tasks reach `to_verify` or `done`.

```
# 1. Periodically check Chorus task status
chorus_list_tasks({ projectUuid: "<project-uuid>" })
# Verify: all tasks should be in to_verify / done

# 2. Close sub-agent sessions when they finish
chorus_close_session({ sessionUuid: "session-fe-uuid" })
chorus_close_session({ sessionUuid: "session-be-uuid" })

# 3. Clean up Claude Code team
# Send shutdown requests to sub-agents, then TeamDelete
```

---

## Handling Task Dependencies (DAG)

When Chorus tasks have dependencies (Task B depends on Task A), the Team Lead must coordinate the execution order:

**Option A: Sequential spawning**
- Spawn Sub-Agent A for Task A first
- Wait for Task A to reach `to_verify` / `done`
- Then spawn Sub-Agent B for Task B

**Option B: Spawn all, let sub-agents wait**
- Spawn all sub-agents immediately
- In the prompt for Sub-Agent B, instruct it to poll `chorus_get_task` on its dependency and wait until it's done before starting work:

```
Before starting your task, check that your dependency is complete:
  chorus_get_task({ taskUuid: "<task-A-uuid>" })
  If status is not "done" or "to_verify", wait and check again.
```

**Option C: Team lead orchestrates via messaging**
- Spawn all sub-agents
- Sub-Agent B starts with non-dependent preparation work
- Team Lead sends a message to Sub-Agent B when Task A completes

---

## Multiple Tasks Per Sub-Agent

A single sub-agent can work on multiple Chorus tasks sequentially. The Team Lead passes multiple task UUIDs, and the sub-agent processes them in order:

```python
Task({
  name: "full-stack-worker",
  prompt: """
    Your Chorus session UUID: session-fs-uuid
    Your Chorus tasks (work in order):
    1. task-schema-uuid — Create database schema
    2. task-api-uuid — Implement API endpoints (depends on #1)
    3. task-tests-uuid — Write integration tests (depends on #2)

    For EACH task:
    - chorus_session_checkin_task → chorus_update_task(in_progress) → work → report → checkout → submit
    - Always use sessionUuid: "session-fs-uuid"
  """
})
```

The sub-agent checks in/out of each task as it progresses, making each transition visible in the UI.

---

## Session Reuse Across Multiple Runs

If the Team Lead spawns sub-agents multiple times (e.g., after a task is reopened by Admin), reuse existing sessions instead of creating new ones:

```
# Check for existing sessions
chorus_list_sessions()

# If "frontend-worker" session exists but is closed, reopen it
chorus_reopen_session({ sessionUuid: "<existing-fe-session-uuid>" })

# Pass the same session UUID to the new sub-agent
```

This keeps session history clean and makes it easier to trace work across multiple runs in the UI.

---

## Troubleshooting

### Sub-agent can't access Chorus MCP tools
- Verify MCP is configured at project level (`.mcp.json` or `.claude/settings.json`), not just user level
- Verify the API key in the MCP config has `developer_agent` role

### UI doesn't show active workers on a task
- The sub-agent likely forgot to call `chorus_session_checkin_task`
- Check: `chorus_get_session({ sessionUuid })` to see active checkins
- Manual fix: call `chorus_session_checkin_task` for the sub-agent's session

### Session shows as "inactive" (yellow dot)
- The sub-agent hasn't sent a heartbeat in over 1 hour
- `chorus_report_work` with `sessionUuid` auto-heartbeats
- For long-running tasks, call `chorus_session_heartbeat` periodically

### Task stuck in wrong status
- If a sub-agent crashed before completing, the task may be stuck in `in_progress`
- Team Lead can: reopen the session, spawn a new sub-agent to continue, or use `chorus_update_task` to reset status

---

## Quick Reference

| Step | Who | Claude Code Tool | Chorus Tool |
|------|-----|-----------------|-------------|
| Plan work | Team Lead | — | `chorus_checkin`, `chorus_list_tasks` |
| Create sessions | Team Lead | — | `chorus_create_session` (one per sub-agent) |
| Create team | Team Lead | `TeamCreate` | — |
| Spawn workers | Team Lead | `Task` (with session + task UUIDs in prompt) | — |
| Checkin to task | Sub-Agent | — | `chorus_session_checkin_task` |
| Start work | Sub-Agent | — | `chorus_update_task(in_progress, sessionUuid)` |
| Report progress | Sub-Agent | — | `chorus_report_work(sessionUuid)` |
| Complete task | Sub-Agent | — | `chorus_session_checkout_task` + `chorus_submit_for_verify` |
| Notify lead | Sub-Agent | `SendMessage` | — |
| Monitor | Team Lead | `TaskList` | `chorus_list_tasks` |
| Close sessions | Team Lead | — | `chorus_close_session` |
| Shutdown | Team Lead | `SendMessage(shutdown_request)` + `TeamDelete` | — |
