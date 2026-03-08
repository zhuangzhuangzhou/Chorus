# Session & Agent Observability

## Overview

The Chorus Session mechanism tracks **which agent is currently working on which task**. Session data powers the UI observability features: Kanban board worker badges, Task Detail panel active workers, Settings page session list.

The Chorus Plugin **fully automates** session lifecycle — you never need to manually create, close, or reopen sessions.

### Core Concepts

```
Single Agent (main agent working directly):
  Agent ──> Session (auto) ──checkin──> Task A

Multi-Agent (Swarm Mode):
  Main Agent (Team Lead)
    ├── Sub-Agent A ──> Session (auto) ──checkin──> Task A
    ├── Sub-Agent B ──> Session (auto) ──checkin──> Task B
    └── Sub-Agent C ──> Session (auto) ──checkin──> Task A, Task B
```

- **Agent** = A Chorus identity (has API Key, role, persona)
- **Session** = A work unit under that Agent (one session per worker, auto-created by plugin)
- **Checkin** = Session declares it is working on a specific Task
- **Heartbeat** = Periodic signal indicating the worker is still active (auto-sent by plugin's TeammateIdle hook)

### Plugin Automation

| Event | Plugin Hook | What Happens |
|-------|------------|--------------|
| Sub-agent spawned | `SubagentStart` | Creates (or reuses) a Chorus Session, injects session UUID + workflow into sub-agent context |
| Sub-agent idle | `TeammateIdle` | Sends `chorus_session_heartbeat` to keep session active |
| Sub-agent exits | `SubagentStop` | Checks out all tasks + closes the session |

**What you still do manually:**
- `chorus_session_checkin_task` — before starting work on a task
- `chorus_session_checkout_task` — when done with a task
- Pass `sessionUuid` to `chorus_update_task` and `chorus_report_work` for attribution

### Mapping to Claude Code Agent Teams

| Claude Code Concept | Chorus Concept | Description |
|---------------------|----------------|-------------|
| Single Agent | Agent + 1 Session (auto) | Plugin creates session automatically |
| Team Lead Agent | Main Agent | Assigns work to sub-agents; does NOT manage sessions |
| Spawned Sub-Agent | Session (auto-created) | Each sub-agent gets its own session automatically |
| Sub-Agent's Task | Session Checkin | Sub-agent checks in to the task it is working on |
| Sub-Agent exits | Session Close (auto) | Plugin closes session, auto-checks out all tasks |

---

## Session Status Lifecycle

```
active ──(1h no heartbeat)──> inactive ──(heartbeat)──> active
  \                              \
   \── (exit) ──>                 \── (exit) ──> closed ──(respawn)──> active
```

| Status | Meaning | UI Indicator |
|--------|---------|-------------|
| `active` | Worker is actively working | Green dot |
| `inactive` | No heartbeat for over 1 hour | Yellow dot |
| `closed` | Session has ended (auto-reopened if sub-agent respawns with same name) | Gray dot |

---

## Session-Enhanced Tools

The following tools accept an optional `sessionUuid` parameter — **always pass it** for proper attribution:

| Tool | Session Behavior |
|------|-----------------|
| `chorus_update_task` | Activity record includes session attribution, auto-heartbeat |
| `chorus_report_work` | Activity record includes session attribution, auto-heartbeat |

---

## UI Observability

Session data is visible in the following UI locations:

1. **Settings page** — Expand "Sessions" under an Agent card to see all session statuses, task counts
2. **Kanban board** — In Progress cards display a worker count badge (e.g., "2 workers")
3. **Task Detail panel** — "Active Workers" section shows the currently checked-in session names and Agents
4. **Activity stream** — Operations with sessions display "AgentName / SessionName" attribution format

---

## Tips

- **Use meaningful sub-agent names** — The sub-agent `name` parameter (e.g., `frontend-worker`, `api-worker`) becomes the Chorus session name. Use descriptive names.
- **Task status ownership** — Only the sub-agent checked into a task should update that task's status. The Team Lead should not move tasks on behalf of sub-agents.
- **report_work includes auto-heartbeat** — Calling `chorus_report_work` with `sessionUuid` automatically updates the heartbeat.
- **A session can check in to multiple tasks** — If a worker handles multiple related tasks simultaneously, it can check in to all of them.
- **Session reuse is automatic** — If a sub-agent with the same name is respawned, the plugin reuses or reopens the existing session instead of creating a new one.
