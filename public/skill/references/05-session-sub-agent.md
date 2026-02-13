# Session & Agent Observability

## Overview

The Chorus Session mechanism tracks **which agent is currently working on which task**. **Developer agents MUST create a session and checkin to tasks** before starting work — this applies to single agents and multi-agent teams alike. Session data powers the UI observability features (Kanban board worker badges, Task Detail panel active workers, Settings page).

### Core Concepts

```
Single Agent:
  Agent ──> Session: "dev-worker" ──checkin──> Task A

Multi-Agent (Swarm Mode):
  Main Agent (Team Lead)
    ├── Session: "frontend-worker"  ──checkin──> Task A
    ├── Session: "backend-worker"   ──checkin──> Task B
    └── Session: "test-runner"      ──checkin──> Task A, Task B
```

- **Agent** = A Chorus identity (has API Key, role, persona)
- **Session** = A work unit under that Agent (one session per worker — even single Developer agents need one)
- **Checkin** = Session declares it is working on a specific Task
- **Heartbeat** = Session heartbeat indicating the worker is still active (automatically marked inactive after 1 hour with no heartbeat)

### Why Sessions Are Mandatory

Without a session checkin, the UI cannot show that an agent is actively working on a task. This means:
- Kanban board cards won't display worker badges
- Task Detail panel won't show active workers
- Settings page won't show which tasks an agent is working on
- Other agents may accidentally claim or work on the same task

### Mapping to Claude Code Agent Teams

For the full Claude Code Agent Teams integration guide, see **[06-claude-code-agent-teams.md](06-claude-code-agent-teams.md)**.

| Claude Code Concept | Chorus Concept | Description |
|---------------------|----------------|-------------|
| Single Agent | Agent + 1 Session | Agent creates one session for itself |
| Team Lead Agent | Main Agent | Owns the API Key, responsible for creating sessions and assigning work |
| Spawned Sub-Agent | Session | Each sub-agent gets its own independent session |
| Sub-Agent's Task | Session Checkin | Sub-agent checks in to the task it is working on |
| Sub-Agent completes and returns | Session Close | Close session, automatically checks out all tasks |

---

## Session Tools

Available to all Agent roles:

| Tool | Purpose |
|------|---------|
| `chorus_create_session` | Create a new session (name + description) |
| `chorus_list_sessions` | List all sessions for the current Agent (filterable by status) |
| `chorus_get_session` | Get session details and active checkins |
| `chorus_close_session` | Close session, automatically checks out all tasks |
| `chorus_reopen_session` | Reopen a closed session (closed → active) |
| `chorus_session_checkin_task` | Session checkin to a task, indicating work has started |
| `chorus_session_checkout_task` | Session checkout from a task, indicating work has ended |
| `chorus_session_heartbeat` | Heartbeat, updates lastActiveAt |

### Session-Enhanced Existing Tools

The following existing tools have an optional `sessionUuid` parameter:

| Tool | Session Behavior |
|------|-----------------|
| `chorus_update_task` | When sessionUuid is provided, the Activity record includes session attribution, auto-heartbeat |
| `chorus_report_work` | When sessionUuid is provided, the Activity record includes session attribution, auto-heartbeat |

---

## Usage Patterns

### Pattern 0: Single Agent (No Sub-Agents)

Even when working as a single agent (not using Agent Teams), **you must create a session and checkin to tasks**. This is the simplest pattern:

```
# 1. Check in
chorus_checkin()

# 2. Create or reopen a session
chorus_list_sessions()
# If a closed session exists, reopen it:
chorus_reopen_session({ sessionUuid: "<existing-session-uuid>" })
# Otherwise create a new one:
chorus_create_session({ name: "dev-worker", description: "Single developer agent" })

# 3. Claim a task
chorus_claim_task({ taskUuid: "<task-uuid>" })

# 4. Checkin to the task (REQUIRED — enables UI observability)
chorus_session_checkin_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })

# 5. Move to in_progress (always pass sessionUuid)
chorus_update_task({ taskUuid: "<task-uuid>", status: "in_progress", sessionUuid: "<session-uuid>" })

# 6. Do work, report progress (always pass sessionUuid)
chorus_report_work({ taskUuid: "<task-uuid>", report: "...", sessionUuid: "<session-uuid>" })

# 7. Checkout and submit when done
chorus_session_checkout_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })
chorus_submit_for_verify({ taskUuid: "<task-uuid>", summary: "..." })

# 8. Close session when all work is done
chorus_close_session({ sessionUuid: "<session-uuid>" })
```

---

### Session Reuse: Check Before Creating

Before creating a new session, always check if you have existing sessions that can be reused:

```
# List all sessions (including closed ones)
chorus_list_sessions()

# If a matching closed session exists, reopen it instead of creating a new one
chorus_reopen_session({ sessionUuid: "<existing-session-uuid>" })

# Only create a new session if no suitable session exists
chorus_create_session({ name: "frontend-worker", description: "Handles frontend component development" })
```

This avoids accumulating redundant sessions. A reopened session retains its original name and UUID, making it easier to track across multiple work cycles.

### Pattern 1: Team Lead Manages Sessions Manually

Suitable when the main Agent manages multiple workers itself:

```
# 1. Main Agent checks in
chorus_checkin()

# 2. Check for existing sessions first
chorus_list_sessions()

# 2a. If a matching closed session exists, reopen it
chorus_reopen_session({ sessionUuid: "<existing-session-uuid>" })

# 2b. Otherwise, create a new sub-agent session
chorus_create_session({ name: "frontend-worker", description: "Handles frontend component development" })
# → Returns sessionUuid

# 3. Checkin to a task
chorus_session_checkin_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })

# 4. Report progress with sessionUuid during work
chorus_report_work({
  taskUuid: "<task-uuid>",
  report: "Completed registration form component",
  sessionUuid: "<session-uuid>"
})

# 5. Close session when done (automatically checks out all tasks)
chorus_close_session({ sessionUuid: "<session-uuid>" })
```

### Pattern 2: Claude Code Agent Teams (Swarm Mode)

For a complete guide on integrating Claude Code Agent Teams with Chorus sessions, see **[06-claude-code-agent-teams.md](06-claude-code-agent-teams.md)**.

Summary: The Team Lead creates one Chorus session per sub-agent, spawns sub-agents with session + task UUIDs in the prompt, and each sub-agent independently manages its own Chorus task lifecycle (checkin → in_progress → report → checkout → submit). The Team Lead monitors completion and closes sessions when done.

---

## Session Status Lifecycle

```
active ──(1h no heartbeat)──> inactive ──(heartbeat)──> active
  \                              \
   \── close_session ──>          \── close_session ──> closed ──(reopen_session)──> active
```

| Status | Meaning | UI Indicator |
|--------|---------|-------------|
| `active` | Worker is actively working | Green dot |
| `inactive` | No heartbeat for over 1 hour | Yellow dot |
| `closed` | Session has ended (can be reopened) | Gray dot |

---

## UI Observability

Session data is visible in the following UI locations:

1. **Settings page** — Expand "Sessions" under an Agent card to see all session statuses, task counts; manual close available
2. **Kanban board** — In Progress cards display a worker count badge (e.g., "2 workers")
3. **Task Detail panel** — "Active Workers" section shows the currently checked-in session names and Agents
4. **Activity stream** — Operations with sessions display "AgentName / SessionName" attribution format

---

## Tips

- **Use meaningful session names** — Use descriptive names like `frontend-worker`, `api-worker`, `test-runner` rather than `worker-1`, `worker-2`
- **Task status ownership** — Only the sub-agent checked into a task should update that task's status (`assigned → in_progress → to_verify`). The team lead should not move tasks on behalf of sub-agents
- **Close sessions promptly** — Close the session after the sub-agent finishes work to avoid showing false active workers in the UI
- **report_work includes auto-heartbeat** — Calling `chorus_report_work` with `sessionUuid` automatically updates the heartbeat; no need to call heartbeat separately
- **close_session includes auto-checkout** — Closing a session automatically checks out all active task checkins
- **A session can check in to multiple tasks** — If a worker handles multiple related tasks simultaneously, it can check in to all of them
