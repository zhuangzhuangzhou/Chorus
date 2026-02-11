// src/services/idea.service.ts
// Idea 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { formatAssigneeComplete, formatCreatedBy } from "@/lib/uuid-resolver";
import { eventBus } from "@/lib/event-bus";
import { AlreadyClaimedError, NotClaimedError, isPrismaNotFound } from "@/lib/errors";

// ===== 类型定义 =====

export interface IdeaListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  status?: string;
  assignedToMe?: boolean;  // Filter for ideas assigned to current user
  actorUuid?: string;      // Current user/agent UUID for assignedToMe filter
  actorType?: string;      // "user" | "agent" for assignedToMe filter
}

export interface IdeaCreateParams {
  companyUuid: string;
  projectUuid: string;
  title: string;
  content?: string | null;
  attachments?: unknown;
  createdByUuid: string;
}

export interface IdeaClaimParams {
  ideaUuid: string;
  companyUuid: string;
  assigneeType: string;
  assigneeUuid: string;
  assignedByUuid?: string | null;
}

// API 响应格式
export interface IdeaResponse {
  uuid: string;
  title: string;
  content: string | null;
  attachments: unknown;
  status: string;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Idea 状态转换规则 (ARCHITECTURE.md §7.3)
export const IDEA_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["assigned", "closed"],
  assigned: ["open", "in_progress", "closed"],
  in_progress: ["pending_review", "closed"],
  pending_review: ["completed", "in_progress", "closed"],
  completed: ["closed"],
  closed: [],
};

// 验证状态转换是否有效
export function isValidIdeaStatusTransition(from: string, to: string): boolean {
  const allowed = IDEA_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ===== 内部辅助函数 =====

// 格式化单个 Idea 为 API 响应格式
async function formatIdeaResponse(
  idea: {
    uuid: string;
    title: string;
    content: string | null;
    attachments: unknown;
    status: string;
    assigneeType: string | null;
    assigneeUuid: string | null;
    assignedAt: Date | null;
    assignedByUuid: string | null;
    createdByUuid: string;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
  }
): Promise<IdeaResponse> {
  const [assignee, createdBy] = await Promise.all([
    formatAssigneeComplete(idea.assigneeType, idea.assigneeUuid, idea.assignedAt, idea.assignedByUuid),
    formatCreatedBy(idea.createdByUuid),
  ]);

  return {
    uuid: idea.uuid,
    title: idea.title,
    content: idea.content,
    attachments: idea.attachments,
    status: idea.status,
    assignee,
    ...(idea.project && { project: idea.project }),
    createdBy,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}

// ===== Service 方法 =====

// Ideas 列表查询
export async function listIdeas({
  companyUuid,
  projectUuid,
  skip,
  take,
  status,
  assignedToMe,
  actorUuid,
  actorType,
}: IdeaListParams): Promise<{ ideas: IdeaResponse[]; total: number }> {
  const where: {
    projectUuid: string;
    companyUuid: string;
    status?: string;
    assigneeUuid?: string;
    assigneeType?: string;
  } = {
    projectUuid,
    companyUuid,
    ...(status && { status }),
  };

  // Add assignedToMe filter if requested
  if (assignedToMe && actorUuid && actorType) {
    where.assigneeUuid = actorUuid;
    where.assigneeType = actorType;
  }

  const [rawIdeas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        title: true,
        content: true,
        attachments: true,
        status: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.idea.count({ where }),
  ]);

  const ideas = await Promise.all(rawIdeas.map(formatIdeaResponse));
  return { ideas, total };
}

// 获取 Idea 详情
export async function getIdea(
  companyUuid: string,
  uuid: string
): Promise<IdeaResponse | null> {
  const idea = await prisma.idea.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  if (!idea) return null;
  return formatIdeaResponse(idea);
}

// 通过 UUID 获取 Idea 原始数据（内部使用，用于权限检查等）
export async function getIdeaByUuid(companyUuid: string, uuid: string) {
  return prisma.idea.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Idea
export async function createIdea(params: IdeaCreateParams): Promise<IdeaResponse> {
  const idea = await prisma.idea.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      title: params.title,
      content: params.content,
      attachments: params.attachments || undefined,
      status: "open",
      createdByUuid: params.createdByUuid,
    },
    select: {
      uuid: true,
      title: true,
      content: true,
      attachments: true,
      status: true,
      assigneeType: true,
      assigneeUuid: true,
      assignedAt: true,
      assignedByUuid: true,
      createdByUuid: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  eventBus.emitChange({ companyUuid: params.companyUuid, projectUuid: params.projectUuid, entityType: "idea", entityUuid: idea.uuid, action: "created" });

  return formatIdeaResponse(idea);
}

// 更新 Idea
export async function updateIdea(
  uuid: string,
  companyUuid: string,
  data: { title?: string; content?: string | null; status?: string }
): Promise<IdeaResponse> {
  const idea = await prisma.idea.update({
    where: { uuid },
    data,
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  eventBus.emitChange({ companyUuid: idea.companyUuid, projectUuid: idea.project!.uuid, entityType: "idea", entityUuid: idea.uuid, action: "updated" });

  return formatIdeaResponse(idea);
}

// 认领 Idea (atomic: only succeeds if status is "open")
export async function claimIdea({
  ideaUuid,
  companyUuid,
  assigneeType,
  assigneeUuid,
  assignedByUuid,
}: IdeaClaimParams): Promise<IdeaResponse> {
  try {
    const idea = await prisma.idea.update({
      where: { uuid: ideaUuid, status: "open" },
      data: {
        status: "assigned",
        assigneeType,
        assigneeUuid,
        assignedAt: new Date(),
        assignedByUuid,
      },
      include: {
        project: { select: { uuid: true, name: true } },
      },
    });

    eventBus.emitChange({ companyUuid: idea.companyUuid, projectUuid: idea.project!.uuid, entityType: "idea", entityUuid: idea.uuid, action: "updated" });

    return formatIdeaResponse(idea);
  } catch (e: unknown) {
    if (isPrismaNotFound(e)) {
      throw new AlreadyClaimedError("Idea");
    }
    throw e;
  }
}

// 放弃认领 Idea (atomic: only succeeds if status is "assigned")
export async function releaseIdea(uuid: string): Promise<IdeaResponse> {
  try {
    const idea = await prisma.idea.update({
      where: { uuid, status: "assigned" },
      data: {
        status: "open",
        assigneeType: null,
        assigneeUuid: null,
        assignedAt: null,
        assignedByUuid: null,
      },
      include: {
        project: { select: { uuid: true, name: true } },
      },
    });

    eventBus.emitChange({ companyUuid: idea.companyUuid, projectUuid: idea.project!.uuid, entityType: "idea", entityUuid: idea.uuid, action: "updated" });

    return formatIdeaResponse(idea);
  } catch (e: unknown) {
    if (isPrismaNotFound(e)) {
      throw new NotClaimedError("Idea");
    }
    throw e;
  }
}

// 删除 Idea
export async function deleteIdea(uuid: string) {
  const idea = await prisma.idea.delete({ where: { uuid } });
  eventBus.emitChange({ companyUuid: idea.companyUuid, projectUuid: idea.projectUuid, entityType: "idea", entityUuid: idea.uuid, action: "deleted" });
  return idea;
}
