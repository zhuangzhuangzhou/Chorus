# Session & Sub-Agent (Swarm Mode)

## Overview

The Chorus Session mechanism allows a main Agent to create multiple **named sub-sessions** (e.g., `frontend-worker`, `backend-worker`), where each session represents a sub-agent worker. Through session checkin/checkout, Chorus can track which worker is working on which task, enabling **Agent work observability**.

### Core Concepts

```
Main Agent (Sr. Claude)
  ├── Session: "frontend-worker"  ──checkin──> Task A
  ├── Session: "backend-worker"   ──checkin──> Task B
  └── Session: "test-runner"      ──checkin──> Task A, Task B
```

- **Agent** = A Chorus identity (has API Key, role, persona)
- **Session** = A work unit under that Agent (represents a sub-agent / worker)
- **Checkin** = Session declares it is working on a specific Task
- **Heartbeat** = Session heartbeat indicating the worker is still active (automatically marked inactive after 1 hour with no heartbeat)

### Mapping to Claude Code Agent Teams

| Claude Code Concept | Chorus Concept | Description |
|---------------------|----------------|-------------|
| Team Lead Agent | Main Agent | Owns the API Key, responsible for creating sessions and assigning work |
| Spawned Sub-Agent | Session | Each sub-agent creates an independent session |
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

### Pattern 2: Claude Code Agent Team Integration

Suitable when using Claude Code's `Task` tool to spawn sub-agents:

**Team Lead (Main Agent) Workflow:**

The team lead creates sessions, assigns task UUIDs to sub-agents, then **delegates all task management** to them. After spawning, the team lead only monitors completion.

```python
# 1. Check in and get tasks
chorus_checkin()
tasks = chorus_list_tasks({ projectUuid, status: "assigned" })

# 2. Create a session for each sub-agent (or reopen existing ones)
session1 = chorus_create_session({ name: "frontend-worker" })
session2 = chorus_create_session({ name: "backend-worker" })

# 3. Spawn sub-agents — pass task UUIDs and session UUID
# DO NOT checkin to tasks or move task status here — that's the sub-agent's job
spawn_agent("frontend-worker", {
  taskUuids: [task1.uuid],
  sessionUuid: session1.uuid,
  instructions: "You own these tasks end-to-end: checkin, move status, report work, submit for verify"
})

# 4. Monitor — periodically check that all tasks reach to_verify/done
chorus_list_tasks({ projectUuid })  # verify no tasks are stuck or missed

# 5. Close sessions when sub-agents finish
chorus_close_session({ sessionUuid: session1.uuid })
```

**Sub-Agent (Worker) Workflow:**

Each sub-agent manages its own tasks end-to-end. The team lead must NOT checkin, move status, or report work on behalf of sub-agents.

```python
# Sub-agent receives sessionUuid and taskUuids from team lead

# 1. Checkin to task — sub-agent does this itself
chorus_session_checkin_task({
  sessionUuid: "<session-uuid>",
  taskUuid: "<task-uuid>"
})

# 2. Move task to in_progress
chorus_update_task({
  taskUuid: "<task-uuid>",
  status: "in_progress",
  sessionUuid: "<session-uuid>"    # Identifies which worker
})

# 3. Periodic heartbeat (report_work auto-heartbeats; explicit call also available)
chorus_session_heartbeat({ sessionUuid: "<session-uuid>" })

# 3. Report progress
chorus_report_work({
  taskUuid: "<task-uuid>",
  report: "Completed API endpoint development",
  sessionUuid: "<session-uuid>"    # Activity will display "Agent / Session"
})

# 4. Submit for verification when done
chorus_submit_for_verify({ taskUuid: "<task-uuid>", summary: "Implemented API endpoints" })

# 5. Checkout from task
chorus_session_checkout_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })

# Team Lead closes the session after sub-agent finishes
```

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
