// src/services/session.service.ts
// Agent Session Service Layer — sub-session management (swarm mode observability)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { claimTask } from "@/services/task.service";

// ===== Type Definitions =====

export interface SessionCreateParams {
  companyUuid: string;
  agentUuid: string;
  name: string;
  description?: string | null;
  expiresAt?: Date | null;
}

export interface SessionCheckinInfo {
  taskUuid: string;
  checkinAt: string;
  checkoutAt: string | null;
}

export interface SessionResponse {
  uuid: string;
  agentUuid: string;
  name: string;
  description: string | null;
  status: string;
  lastActiveAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  checkins: SessionCheckinInfo[];
}

export interface TaskSessionInfo {
  sessionUuid: string;
  sessionName: string;
  agentUuid: string;
  agentName: string;
  checkinAt: string;
}

// ===== Internal Helper Functions =====

function formatSessionResponse(
  session: {
    uuid: string;
    agentUuid: string;
    name: string;
    description: string | null;
    status: string;
    lastActiveAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    taskCheckins?: Array<{
      taskUuid: string;
      checkinAt: Date;
      checkoutAt: Date | null;
    }>;
  }
): SessionResponse {
  return {
    uuid: session.uuid,
    agentUuid: session.agentUuid,
    name: session.name,
    description: session.description,
    status: session.status,
    lastActiveAt: session.lastActiveAt.toISOString(),
    expiresAt: session.expiresAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    checkins: (session.taskCheckins || []).map((c) => ({
      taskUuid: c.taskUuid,
      checkinAt: c.checkinAt.toISOString(),
      checkoutAt: c.checkoutAt?.toISOString() ?? null,
    })),
  };
}

// ===== Service Methods =====

// Create Session
export async function createSession(params: SessionCreateParams): Promise<SessionResponse> {
  const session = await prisma.agentSession.create({
    data: {
      companyUuid: params.companyUuid,
      agentUuid: params.agentUuid,
      name: params.name,
      description: params.description ?? null,
      status: "active",
      expiresAt: params.expiresAt ?? null,
    },
  });

  return formatSessionResponse(session);
}

// Get Session details (including active checkins)
export async function getSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse | null> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  if (!session) return null;
  return formatSessionResponse(session);
}

// List Agent's Sessions
export async function listAgentSessions(
  companyUuid: string,
  agentUuid: string,
  status?: string
): Promise<SessionResponse[]> {
  const sessions = await prisma.agentSession.findMany({
    where: {
      companyUuid,
      agentUuid,
      ...(status && { status }),
    },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map(formatSessionResponse);
}

// Close Session (status->closed, batch checkout all checkins)
export async function closeSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });

  if (!session) throw new Error("Session not found");

  // Query active checkins before batch checkout for event emission
  const activeCheckins = await prisma.sessionTaskCheckin.findMany({
    where: { sessionUuid, checkoutAt: null },
    select: { task: { select: { uuid: true, projectUuid: true } } },
  });

  // Batch checkout all active checkins
  await prisma.sessionTaskCheckin.updateMany({
    where: { sessionUuid, checkoutAt: null },
    data: { checkoutAt: new Date() },
  });

  const updated = await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: { status: "closed" },
    include: {
      taskCheckins: {
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  for (const checkin of activeCheckins) {
    eventBus.emitChange({ companyUuid: session.companyUuid, projectUuid: checkin.task.projectUuid, entityType: "task", entityUuid: checkin.task.uuid, action: "updated" });
  }

  return formatSessionResponse(updated);
}

// Session checkin to Task
export async function sessionCheckinToTask(
  companyUuid: string,
  sessionUuid: string,
  taskUuid: string
): Promise<SessionCheckinInfo> {
  // Verify session exists and belongs to this company
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid, status: "active" },
  });
  if (!session) throw new Error("Session not found or not active");

  // Verify task exists and belongs to this company
  const task = await prisma.task.findFirst({
    where: { uuid: taskUuid, companyUuid },
  });
  if (!task) throw new Error("Task not found");

  // Auto-claim: if task has no assignee, claim it for the session's agent
  if (!task.assigneeUuid) {
    try {
      await claimTask({
        taskUuid,
        companyUuid,
        assigneeType: "agent",
        assigneeUuid: session.agentUuid,
      });
    } catch {
      // Claim may fail if task was concurrently claimed — safe to ignore
    }
  }

  // Upsert: reactivate if already exists
  const checkin = await prisma.sessionTaskCheckin.upsert({
    where: {
      sessionUuid_taskUuid: { sessionUuid, taskUuid },
    },
    create: { sessionUuid, taskUuid },
    update: { checkoutAt: null, checkinAt: new Date() },
  });

  // Update lastActiveAt
  await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: { lastActiveAt: new Date() },
  });

  eventBus.emitChange({ companyUuid, projectUuid: task.projectUuid, entityType: "task", entityUuid: taskUuid, action: "updated" });

  return {
    taskUuid: checkin.taskUuid,
    checkinAt: checkin.checkinAt.toISOString(),
    checkoutAt: checkin.checkoutAt?.toISOString() ?? null,
  };
}

// Session checkout from Task
export async function sessionCheckoutFromTask(
  companyUuid: string,
  sessionUuid: string,
  taskUuid: string
): Promise<void> {
  // Verify session belongs to this company
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });
  if (!session) throw new Error("Session not found");

  const task = await prisma.task.findFirst({
    where: { uuid: taskUuid, companyUuid },
    select: { projectUuid: true },
  });

  await prisma.sessionTaskCheckin.updateMany({
    where: { sessionUuid, taskUuid, checkoutAt: null },
    data: { checkoutAt: new Date() },
  });

  if (task) {
    eventBus.emitChange({ companyUuid, projectUuid: task.projectUuid, entityType: "task", entityUuid: taskUuid, action: "updated" });
  }
}

// Get all active Sessions for a Task
export async function getSessionsForTask(
  companyUuid: string,
  taskUuid: string
): Promise<TaskSessionInfo[]> {
  const checkins = await prisma.sessionTaskCheckin.findMany({
    where: {
      taskUuid,
      checkoutAt: null,
      session: { companyUuid, status: { in: ["active", "inactive"] } },
    },
    include: {
      session: {
        select: {
          uuid: true,
          name: true,
          agentUuid: true,
          agent: { select: { name: true } },
        },
      },
    },
  });

  return checkins.map((c) => ({
    sessionUuid: c.session.uuid,
    sessionName: c.session.name,
    agentUuid: c.session.agentUuid,
    agentName: c.session.agent.name,
    checkinAt: c.checkinAt.toISOString(),
  }));
}

// Heartbeat update lastActiveAt
export async function heartbeatSession(
  companyUuid: string,
  sessionUuid: string
): Promise<void> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });
  if (!session) throw new Error("Session not found");

  await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: {
      lastActiveAt: new Date(),
      // If status is inactive, restore to active after heartbeat
      ...(session.status === "inactive" && { status: "active" }),
    },
  });
}

// Reopen a closed Session (closed -> active)
export async function reopenSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });

  if (!session) throw new Error("Session not found");
  if (session.status !== "closed") throw new Error("Only closed sessions can be reopened");

  const updated = await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: {
      status: "active",
      lastActiveAt: new Date(),
    },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  return formatSessionResponse(updated);
}

// Batch get active worker counts for multiple tasks (1 groupBy query instead of N individual queries)
export async function batchGetWorkerCountsForTasks(
  companyUuid: string,
  taskUuids: string[]
): Promise<Record<string, number>> {
  if (taskUuids.length === 0) return {};

  const checkins = await prisma.sessionTaskCheckin.groupBy({
    by: ["taskUuid"],
    where: {
      taskUuid: { in: taskUuids },
      checkoutAt: null,
      session: { companyUuid, status: { in: ["active", "inactive"] } },
    },
    _count: { taskUuid: true },
  });

  const result: Record<string, number> = {};
  for (const checkin of checkins) {
    result[checkin.taskUuid] = checkin._count.taskUuid;
  }
  return result;
}

// Batch mark inactive sessions (no heartbeat for 1 hour)
export async function markInactiveSessions(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await prisma.agentSession.updateMany({
    where: {
      status: "active",
      lastActiveAt: { lt: oneHourAgo },
    },
    data: { status: "inactive" },
  });

  return result.count;
}

// Get Session name (for Activity display)
export async function getSessionName(sessionUuid: string): Promise<string | null> {
  const session = await prisma.agentSession.findUnique({
    where: { uuid: sessionUuid },
    select: { name: true },
  });
  return session?.name ?? null;
}

/**
 * Get all active sessions that have active checkins to tasks in a given project.
 * Returns up to 5 unique sessions (for PixelCanvas slots).
 */
export async function getActiveSessionsForProject(
  companyUuid: string,
  projectUuid: string
): Promise<TaskSessionInfo[]> {
  const checkins = await prisma.sessionTaskCheckin.findMany({
    where: {
      checkoutAt: null,
      task: { projectUuid },
      session: { companyUuid, status: { in: ["active", "inactive"] } },
    },
    include: {
      session: {
        select: {
          uuid: true,
          name: true,
          agentUuid: true,
          agent: { select: { name: true } },
        },
      },
    },
    orderBy: { checkinAt: "asc" },
  });

  // Deduplicate by session UUID, keep first checkin per session
  const seen = new Set<string>();
  const unique: TaskSessionInfo[] = [];
  for (const c of checkins) {
    if (seen.has(c.session.uuid)) continue;
    seen.add(c.session.uuid);
    unique.push({
      sessionUuid: c.session.uuid,
      sessionName: c.session.name,
      agentUuid: c.session.agentUuid,
      agentName: c.session.agent.name,
      checkinAt: c.checkinAt.toISOString(),
    });
    if (unique.length >= 5) break;
  }

  return unique;
}
