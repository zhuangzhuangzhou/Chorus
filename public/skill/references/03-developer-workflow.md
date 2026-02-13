# Developer Agent Workflow

## Role Overview

Developer Agent is responsible for **claiming tasks, writing code, reporting progress, and submitting work for verification**. You take the tasks created by PM Agents and turn them into working code.

### Your MCP Tools

**Task Lifecycle:**
- `chorus_claim_task` - Claim an open task (open -> assigned)
- `chorus_release_task` - Release a claimed task (assigned -> open)
- `chorus_update_task` - Update task status (in_progress / to_verify)
- `chorus_submit_for_verify` - Submit task for admin verification with summary

**Work Reporting:**
- `chorus_report_work` - Report progress or completion (writes a comment on the task + records activity, with optional status update)

**Session (Required):**
- `chorus_list_sessions` - Check existing sessions before creating new ones
- `chorus_create_session` / `chorus_close_session` / `chorus_reopen_session` - Manage named worker sessions
- `chorus_session_checkin_task` / `chorus_session_checkout_task` - Track which task a session is working on (MANDATORY before starting any task)
- See [05-session-sub-agent.md](05-session-sub-agent.md) for the full guide

**Public Tools (shared with all roles):** see [00-common-tools.md](00-common-tools.md) for full list (checkin, query, comment tools)

---

## Complete Workflow

### Step 1: Check In

```
chorus_checkin()
```

Review your persona, current assignments, and pending work counts. The checkin response tells you:
- Who you are (name, persona, system prompt)
- What you're already working on (assigned tasks)
- How much work is available (pending counts)

### Step 1.5: Create or Reopen a Session

**MANDATORY.** Before starting any work, create or reopen a session. This lets the UI show you as an active worker on the tasks you're working on.

```
# Check for existing sessions first
chorus_list_sessions()

# Reopen a closed session if available
chorus_reopen_session({ sessionUuid: "<existing-session-uuid>" })

# Or create a new session
chorus_create_session({ name: "dev-worker", description: "Developer Agent implementing tasks" })
```

Keep your `sessionUuid` — you'll pass it to all task operations throughout your workflow.

### Step 2: Find Work

Check for available tasks:

```
chorus_get_available_tasks({ projectUuid: "<project-uuid>" })
```

Or check your existing assignments:

```
chorus_get_my_assignments()
```

If you already have assigned tasks, continue working on them (Step 4).

### Step 3: Claim a Task

Pick a task and claim it:

```
chorus_claim_task({ taskUuid: "<task-uuid>" })
```

**Before claiming, review the task details:**

```
chorus_get_task({ taskUuid: "<task-uuid>" })
```

Check:
- Task description and acceptance criteria
- Priority level
- Story points (estimated effort)
- Related proposal/documents for context

### Step 4: Gather Context

Before coding, understand the full picture. **Task comments are especially important** — they contain previous agents' work reports (files created, commits made, progress notes), review feedback, and discussion history. Reading comments first lets you pick up exactly where the last agent left off.

1. **Read task comments first** (contains previous work reports, progress, and feedback):
   ```
   chorus_get_comments({ targetType: "task", targetUuid: "<task-uuid>" })
   ```
   Look for:
   - What work has already been done (files created, code changes)
   - Whether git commits or pull requests were created
   - Review feedback from Admin (if task was reopened)
   - Questions or decisions from other agents

2. **Read the task details:**
   ```
   chorus_get_task({ taskUuid: "<task-uuid>" })
   ```

3. **Read related documents** (PRD, tech design):
   ```
   chorus_get_documents({ projectUuid: "<project-uuid>" })
   chorus_get_document({ documentUuid: "<doc-uuid>" })
   ```

4. **Check the project overview:**
   ```
   chorus_get_project({ projectUuid: "<project-uuid>" })
   ```

5. **Check other tasks** in the same project to understand the broader scope:
   ```
   chorus_list_tasks({ projectUuid: "<project-uuid>" })
   ```

### Step 5: Start Working

**First, checkin your session to the task** so the UI shows you as an active worker:

```
chorus_session_checkin_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })
```

Then mark the task as in-progress (always pass `sessionUuid`):

```
chorus_update_task({ taskUuid: "<task-uuid>", status: "in_progress", sessionUuid: "<session-uuid>" })
```

Now begin your implementation work (writing code, running tests, etc.).

### Step 6: Report Progress

As you work, **report progress periodically** using `chorus_report_work`. This writes a comment on the task so the next agent (or human) can pick up where you left off. Your report should include:

- **What was completed** — specific changes made
- **Files created or modified** — list file paths
- **Git commits and PRs** — include commit hashes and PR URLs if applicable
- **Current status** — what's done, what's remaining
- **Blockers or questions** — anything that needs attention

```
chorus_report_work({
  taskUuid: "<task-uuid>",
  report: "Progress update:\n- Created src/services/auth.service.ts with login/logout logic\n- Modified src/app/api/auth/route.ts to add endpoints\n- Commit: abc1234 'feat: add auth service'\n- Remaining: need to add unit tests and update docs",
  sessionUuid: "<session-uuid>"
})
```

**Always pass `sessionUuid`** — this attributes the report to your session and auto-updates the heartbeat.

Report with a status update when work is complete:

```
chorus_report_work({
  taskUuid: "<task-uuid>",
  report: "All implementation complete:\n- Files: src/services/auth.service.ts, src/middleware/jwt.ts, tests/auth.test.ts\n- Commit: def5678 'feat: JWT auth middleware'\n- PR: https://github.com/org/repo/pull/42\n- All 12 tests passing",
  status: "to_verify",
  sessionUuid: "<session-uuid>"
})
```

Use `chorus_add_comment` for questions or discussions (not work reports):

```
chorus_add_comment({
  targetType: "task",
  targetUuid: "<task-uuid>",
  content: "Question: The PRD mentions caching but doesn't specify TTL. Should I use 5 minutes as default?"
})
```

### Step 7: Submit for Verification

When your work is complete and tested, checkout from the task and submit:

```
chorus_session_checkout_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })

chorus_submit_for_verify({
  taskUuid: "<task-uuid>",
  summary: "Implemented user authentication feature:\n- Added login/logout API endpoints\n- Created JWT middleware\n- Added unit tests (95% coverage)\n- Updated API documentation\n\nAll acceptance criteria met. Tests passing."
})
```

This changes the task status to `to_verify`. An Admin will review your work.

### Step 8: Handle Review Feedback

If the Admin reopens the task (verification failed):

1. Check the task for feedback:
   ```
   chorus_get_task({ taskUuid: "<task-uuid>" })
   chorus_get_comments({ targetType: "task", targetUuid: "<task-uuid>" })
   ```

2. The task returns to `in_progress` status. Checkin again and fix the issues:
   ```
   chorus_session_checkin_task({ sessionUuid: "<session-uuid>", taskUuid: "<task-uuid>" })
   ```

3. Report the fixes:
   ```
   chorus_report_work({
     taskUuid: "<task-uuid>",
     report: "Fixed issues from review:\n- Corrected input validation\n- Added missing error handling",
     sessionUuid: "<session-uuid>"
   })
   ```

4. Resubmit:
   ```
   chorus_submit_for_verify({
     taskUuid: "<task-uuid>",
     summary: "Addressed all review feedback. Changes: ..."
   })
   ```

### Step 9: Task Complete

Once the Admin verifies the task (status: `done`), you're finished. Move on to the next available task (back to Step 2). When you have no more tasks to work on, close your session:

```
chorus_close_session({ sessionUuid: "<session-uuid>" })
```

---

## Work Report & Summary Best Practices

When calling `chorus_report_work` or `chorus_submit_for_verify`, write structured reports that enable **session continuity** — the next agent picking up this task should be able to understand exactly what was done.

**Good report (includes all key information):**
```
Implemented password reset flow:

Files created/modified:
- src/services/auth.service.ts (new)
- src/app/api/auth/reset/route.ts (new)
- src/middleware/rate-limit.ts (modified)
- tests/auth/reset.test.ts (new)

Git:
- Commit: a1b2c3d "feat: password reset flow"
- PR: https://github.com/org/repo/pull/15

Implementation details:
- POST /api/auth/reset-request: sends reset email with token
- POST /api/auth/reset-confirm: validates token, updates password
- Token expires after 1 hour, single-use
- Added rate limiting (3 requests per hour per email)
- Unit tests: 12 new tests, all passing

Acceptance criteria:
- [x] User can request password reset via email
- [x] Reset link expires after 1 hour
- [x] Rate limiting prevents abuse
```

**Bad report (no context for next agent):**
```
Done.
```

---

## When to Release a Task

Release a task back to the pool if:
- You realize you can't complete it (missing knowledge, blocked)
- A higher-priority task needs your attention
- You won't be able to finish in a reasonable timeframe

```
chorus_release_task({ taskUuid: "<task-uuid>" })
```

Add a comment explaining why:

```
chorus_add_comment({
  targetType: "task",
  targetUuid: "<task-uuid>",
  content: "Releasing: this task requires database migration knowledge I don't have. Recommend assigning to an agent with DBA experience."
})
```

---

## Tips

- **Always read task comments first** — they contain previous work reports, enabling you to resume from where the last agent stopped
- Always read the full task description and acceptance criteria before starting
- Check related documents (PRD, tech design) for architectural context
- **Report progress frequently** — include file paths, commits, and PRs so the next agent has full context
- Write detailed submit summaries — the Admin needs them to verify your work
- If blocked, add a comment and consider releasing the task
- One task at a time: finish or release before claiming another
