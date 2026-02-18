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

The Chorus Plugin **fully automates** session lifecycle for Claude Code Agent Teams. When a sub-agent is spawned, the plugin automatically creates (or reuses) a Chorus session and writes the session UUID to `.chorus/sessions/<name>.json`. When the sub-agent goes idle, the plugin sends heartbeats. When the sub-agent exits, the plugin closes the session. The Team Lead does NOT manage sessions for sub-agents.

| Claude Code Concept | Chorus Concept | Description |
|---------------------|----------------|-------------|
| Single Agent | Agent + 1 Session | Agent creates one session for itself |
| Team Lead Agent | Main Agent | Owns the API Key, assigns work to sub-agents (does NOT create sessions for them) |
| Spawned Sub-Agent | Session (auto-created by plugin) | Each sub-agent gets its own session, created automatically |
| Sub-Agent's Task | Session Checkin | Sub-agent checks in to the task it is working on |
| Sub-Agent completes and returns | Session Close (auto by plugin) | Plugin closes session on exit, automatically checks out all tasks |

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

**For sub-agents:** The Chorus Plugin handles session reuse automatically — if a session with the same name already exists, the plugin reopens it instead of creating a new one.

**For standalone agents (Pattern 0):** Before creating a new session, check for reusable ones:

```
# List all sessions (including closed ones)
chorus_list_sessions()

# If a matching closed session exists, reopen it instead of creating a new one
chorus_reopen_session({ sessionUuid: "<existing-session-uuid>" })

# Only create a new session if no suitable session exists
chorus_create_session({ name: "frontend-worker", description: "Handles frontend component development" })
```

This avoids accumulating redundant sessions. A reopened session retains its original name and UUID, making it easier to track across multiple work cycles.

### Pattern 1: Claude Code Agent Teams (Swarm Mode)

For a complete guide on integrating Claude Code Agent Teams with Chorus sessions, see **[06-claude-code-agent-teams.md](06-claude-code-agent-teams.md)**.

The Chorus Plugin **fully automates** session lifecycle for Agent Teams:

- **Session creation**: When the Team Lead spawns a sub-agent, the plugin automatically creates a new session (or reopens an existing one with the same name). The Team Lead does NOT call `chorus_create_session` for sub-agents.
- **Session discovery**: Sub-agents read their session UUID from `.chorus/sessions/<name>.json` (where `<name>` matches the sub-agent's `name` parameter in the `Task` tool call).
- **Heartbeat**: The plugin sends heartbeats automatically when a sub-agent goes idle, keeping the session active.
- **Session close**: When a sub-agent exits, the plugin closes its session automatically. The Team Lead does NOT call `chorus_close_session` for sub-agents.

The Team Lead only passes **Chorus task UUIDs** to sub-agents in the prompt — no session UUIDs needed.

Each sub-agent independently manages its own Chorus task lifecycle (checkin → in_progress → report → checkout → submit).

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

- **Do NOT call `chorus_create_session` for sub-agents** — The Chorus Plugin creates sessions automatically when sub-agents spawn. Calling it manually will create duplicate sessions.
- **Do NOT call `chorus_close_session` for sub-agents** — The plugin closes sessions automatically when sub-agents exit. Manual close is only needed for your own session (single-agent pattern).
- **Use meaningful sub-agent names** — The sub-agent `name` parameter (e.g., `frontend-worker`, `api-worker`) becomes the Chorus session name. Use descriptive names rather than `worker-1`, `worker-2`.
- **Task status ownership** — Only the sub-agent checked into a task should update that task's status (`assigned → in_progress → to_verify`). The team lead should not move tasks on behalf of sub-agents.
- **report_work includes auto-heartbeat** — Calling `chorus_report_work` with `sessionUuid` automatically updates the heartbeat; no need to call heartbeat separately.
- **close_session includes auto-checkout** — Closing a session automatically checks out all active task checkins.
- **A session can check in to multiple tasks** — If a worker handles multiple related tasks simultaneously, it can check in to all of them.
- **Session file location** — Sub-agents find their session UUID at `.chorus/sessions/<name>.json`. If the file is missing, ensure the sub-agent was spawned with a `name` parameter.
