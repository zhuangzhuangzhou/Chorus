// src/services/proposal.service.ts
// Proposal 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs
// Container Model: Proposal contains documentDrafts and taskDrafts

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { formatCreatedBy, formatReview } from "@/lib/uuid-resolver";
import { createDocumentFromProposal } from "./document.service";
import { createTasksFromProposal } from "./task.service";

// ===== UUID 辅助函数 =====

// 确保 DocumentDraft 有 UUID
function ensureDocumentDraftUuid(draft: Omit<DocumentDraft, "uuid"> & { uuid?: string }): DocumentDraft {
  return {
    ...draft,
    uuid: draft.uuid || randomUUID(),
  };
}

// 确保 TaskDraft 有 UUID
function ensureTaskDraftUuid(draft: Omit<TaskDraft, "uuid"> & { uuid?: string }): TaskDraft {
  return {
    ...draft,
    uuid: draft.uuid || randomUUID(),
  };
}

// ===== 类型定义 =====

export interface ProposalListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  status?: string;
}

// 文档草稿类型（带 UUID 以便追踪和修改）
export interface DocumentDraft {
  uuid: string;      // Draft UUID for tracking
  type: string;
  title: string;
  content: string;
}

// 任务草稿类型（带 UUID 以便追踪和修改）
export interface TaskDraft {
  uuid: string;      // Draft UUID for tracking
  title: string;
  description?: string;
  storyPoints?: number;
  priority?: string;
  acceptanceCriteria?: string;  // 验收标准
  dependsOnDraftUuids?: string[];  // 依赖的 taskDraft UUID 列表
}

// 输入类型（uuid 可选，会自动生成）
export type DocumentDraftInput = Omit<DocumentDraft, "uuid"> & { uuid?: string };
export type TaskDraftInput = Omit<TaskDraft, "uuid"> & { uuid?: string };

export interface ProposalCreateParams {
  companyUuid: string;
  projectUuid: string;
  title: string;
  description?: string | null;
  inputType: string;
  inputUuids: string[];  // UUID array
  documentDrafts?: DocumentDraftInput[];  // UUID optional, will be auto-generated
  taskDrafts?: TaskDraftInput[];          // UUID optional, will be auto-generated
  createdByUuid: string;
  createdByType?: string;  // agent | user
}

// API 响应格式
export interface ProposalResponse {
  uuid: string;
  title: string;
  description: string | null;
  inputType: string;
  inputUuids: string[];
  documentDrafts: DocumentDraft[] | null;
  taskDrafts: TaskDraft[] | null;
  status: string;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  createdByType: string;
  review: {
    reviewedBy: { type: string; uuid: string; name: string };
    reviewNote: string | null;
    reviewedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 内部辅助函数 =====

// 格式化单个 Proposal 为 API 响应格式
async function formatProposalResponse(
  proposal: {
    uuid: string;
    title: string;
    description: string | null;
    inputType: string;
    inputUuids: unknown;  // JSON field - array of UUID strings
    documentDrafts: unknown;
    taskDrafts: unknown;
    status: string;
    createdByUuid: string;
    createdByType: string;
    reviewedByUuid: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
  }
): Promise<ProposalResponse> {
  const creatorType = proposal.createdByType === "user" ? "user" : "agent";
  const [createdBy, review] = await Promise.all([
    formatCreatedBy(proposal.createdByUuid, creatorType),
    formatReview(proposal.reviewedByUuid, proposal.reviewNote, proposal.reviewedAt),
  ]);

  const response: ProposalResponse = {
    uuid: proposal.uuid,
    title: proposal.title,
    description: proposal.description,
    inputType: proposal.inputType,
    inputUuids: proposal.inputUuids as string[],
    documentDrafts: proposal.documentDrafts as DocumentDraft[] | null,
    taskDrafts: proposal.taskDrafts as TaskDraft[] | null,
    status: proposal.status,
    createdBy,
    createdByType: proposal.createdByType,
    review,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };

  if (proposal.project) {
    response.project = proposal.project;
  }

  return response;
}

// ===== 验证函数 =====

// 检查 Ideas 是否已被其他 Proposal 使用
export async function checkIdeasAvailability(
  companyUuid: string,
  ideaUuids: string[]
): Promise<{ available: boolean; usedIdeas: { uuid: string; proposalUuid: string; proposalTitle: string }[] }> {
  // Find all proposals that use any of the given ideas
  const proposals = await prisma.proposal.findMany({
    where: {
      companyUuid,
      inputType: "idea",
    },
    select: {
      uuid: true,
      title: true,
      inputUuids: true,
    },
  });

  const usedIdeas: { uuid: string; proposalUuid: string; proposalTitle: string }[] = [];

  for (const proposal of proposals) {
    const proposalInputUuids = proposal.inputUuids as string[];
    for (const ideaUuid of ideaUuids) {
      if (proposalInputUuids.includes(ideaUuid)) {
        usedIdeas.push({
          uuid: ideaUuid,
          proposalUuid: proposal.uuid,
          proposalTitle: proposal.title,
        });
      }
    }
  }

  return {
    available: usedIdeas.length === 0,
    usedIdeas,
  };
}

// 检查当前用户是否是 Ideas 的认领者
export async function checkIdeasAssignee(
  companyUuid: string,
  ideaUuids: string[],
  actorUuid: string,
  actorType: string
): Promise<{ valid: boolean; unassignedIdeas: string[] }> {
  const ideas = await prisma.idea.findMany({
    where: {
      uuid: { in: ideaUuids },
      companyUuid,
    },
    select: {
      uuid: true,
      assigneeType: true,
      assigneeUuid: true,
    },
  });

  const unassignedIdeas: string[] = [];

  for (const idea of ideas) {
    // Check if current actor is the assignee
    const isAssignee =
      idea.assigneeType === actorType && idea.assigneeUuid === actorUuid;

    if (!isAssignee) {
      unassignedIdeas.push(idea.uuid);
    }
  }

  return {
    valid: unassignedIdeas.length === 0,
    unassignedIdeas,
  };
}

// ===== Service 方法 =====

// Proposals 列表查询
export async function listProposals({
  companyUuid,
  projectUuid,
  skip,
  take,
  status,
}: ProposalListParams): Promise<{ proposals: ProposalResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    ...(status && { status }),
  };

  const [rawProposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        title: true,
        description: true,
        inputType: true,
        inputUuids: true,
        documentDrafts: true,
        taskDrafts: true,
        status: true,
        createdByUuid: true,
        createdByType: true,
        reviewedByUuid: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.proposal.count({ where }),
  ]);

  const proposals = await Promise.all(
    rawProposals.map((p) => formatProposalResponse(p))
  );
  return { proposals, total };
}

// 获取 Proposal 详情
export async function getProposal(
  companyUuid: string,
  uuid: string
): Promise<ProposalResponse | null> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  if (!proposal) return null;
  return formatProposalResponse(proposal);
}

// 通过 UUID 获取 Proposal 原始数据（内部使用）
export async function getProposalByUuid(companyUuid: string, uuid: string) {
  return prisma.proposal.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Proposal（容器）
export async function createProposal(
  params: ProposalCreateParams
): Promise<ProposalResponse> {
  // Ensure all drafts have UUIDs
  const documentDraftsWithUuids = params.documentDrafts?.map(ensureDocumentDraftUuid);
  const taskDraftsWithUuids = params.taskDrafts?.map(ensureTaskDraftUuid);

  const proposal = await prisma.proposal.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      title: params.title,
      description: params.description,
      inputType: params.inputType,
      inputUuids: params.inputUuids as unknown as Prisma.InputJsonValue,
      // Cast JSON arrays through unknown for proper type compatibility
      ...(documentDraftsWithUuids && { documentDrafts: documentDraftsWithUuids as unknown as Prisma.InputJsonValue }),
      ...(taskDraftsWithUuids && { taskDrafts: taskDraftsWithUuids as unknown as Prisma.InputJsonValue }),
      status: "draft",
      createdByUuid: params.createdByUuid,
      createdByType: params.createdByType || "agent",
    },
    select: {
      uuid: true,
      title: true,
      description: true,
      inputType: true,
      inputUuids: true,
      documentDrafts: true,
      taskDrafts: true,
      status: true,
      createdByUuid: true,
      createdByType: true,
      reviewedByUuid: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatProposalResponse(proposal);
}

// 更新 Proposal 内容（添加/修改文档草稿和任务）
export async function updateProposalContent(
  proposalUuid: string,
  companyUuid: string,
  updates: {
    title?: string;
    description?: string | null;
    documentDrafts?: DocumentDraft[] | null;
    taskDrafts?: TaskDraft[] | null;
  }
): Promise<ProposalResponse> {
  // Build update data with proper JSON null handling
  const updateData: Prisma.ProposalUpdateInput = {};

  if (updates.title) {
    updateData.title = updates.title;
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.documentDrafts !== undefined) {
    updateData.documentDrafts = updates.documentDrafts === null
      ? Prisma.JsonNull
      : (updates.documentDrafts as unknown as Prisma.InputJsonValue);
  }
  if (updates.taskDrafts !== undefined) {
    updateData.taskDrafts = updates.taskDrafts === null
      ? Prisma.JsonNull
      : (updates.taskDrafts as unknown as Prisma.InputJsonValue);
  }

  const proposal = await prisma.proposal.update({
    where: { uuid: proposalUuid, companyUuid },
    data: updateData,
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(proposal);
}

// 审批通过 Proposal
export async function approveProposal(
  proposalUuid: string,
  companyUuid: string,
  reviewedByUuid: string,
  reviewNote?: string | null
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid },
  });

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  // 开启事务处理
  const updatedProposal = await prisma.$transaction(async (tx) => {
    // 更新 Proposal 状态
    const updated = await tx.proposal.update({
      where: { uuid: proposalUuid },
      data: {
        status: "approved",
        reviewedByUuid,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
      include: {
        project: { select: { uuid: true, name: true } },
      },
    });

    // 根据容器内容创建产物
    const documentDrafts = proposal.documentDrafts as DocumentDraft[] | null;
    const taskDrafts = proposal.taskDrafts as TaskDraft[] | null;

    // 创建文档（如果有文档草稿）
    if (documentDrafts && documentDrafts.length > 0) {
      for (const draft of documentDrafts) {
        await createDocumentFromProposal(
          proposal.companyUuid,
          proposal.projectUuid,
          proposal.uuid,
          proposal.createdByUuid,
          draft
        );
      }
    }

    // 创建任务（如果有任务草稿）
    if (taskDrafts && taskDrafts.length > 0) {
      const { draftToTaskUuidMap } = await createTasksFromProposal(
        proposal.companyUuid,
        proposal.projectUuid,
        proposal.uuid,
        proposal.createdByUuid,
        taskDrafts
      );

      // 物化依赖关系：将 draftUuid 引用转换为真实 taskUuid
      for (const draft of taskDrafts) {
        if (draft.dependsOnDraftUuids && draft.dependsOnDraftUuids.length > 0) {
          const taskUuid = draftToTaskUuidMap.get(draft.uuid);
          if (!taskUuid) continue;

          for (const depDraftUuid of draft.dependsOnDraftUuids) {
            const depTaskUuid = draftToTaskUuidMap.get(depDraftUuid);
            if (!depTaskUuid) continue;

            await tx.taskDependency.create({
              data: { taskUuid, dependsOnUuid: depTaskUuid },
            });
          }
        }
      }
    }

    return updated;
  });

  return formatProposalResponse(updatedProposal);
}

// 打回 Proposal（reject → draft，可重新编辑）
// 保留 reviewedByUuid/reviewedAt/reviewNote 作为修改参考
export async function rejectProposal(
  proposalUuid: string,
  reviewedByUuid: string,
  reviewNote: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      status: "draft",
      reviewedByUuid,
      reviewNote,
      reviewedAt: new Date(),
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(proposal);
}

// 关闭 Proposal（终态）
export async function closeProposal(
  proposalUuid: string,
  closedByUuid: string,
  reviewNote: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      status: "closed",
      reviewedByUuid: closedByUuid,
      reviewNote,
      reviewedAt: new Date(),
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(proposal);
}

// ===== Draft 管理函数 =====

// 提交 Proposal 审批（draft → pending）
export async function submitProposal(
  proposalUuid: string,
  companyUuid: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid },
  });

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  if (proposal.status !== "draft") {
    throw new Error("Only draft proposals can be submitted for review");
  }

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      status: "pending",
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 添加文档草稿到 Proposal
export async function addDocumentDraft(
  proposalUuid: string,
  companyUuid: string,
  draft: Omit<DocumentDraft, "uuid"> & { uuid?: string }
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.documentDrafts as unknown as DocumentDraft[]) || [];
  const newDraft = ensureDocumentDraftUuid(draft);
  const updatedDrafts = [...existingDrafts, newDraft];

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      documentDrafts: updatedDrafts as unknown as Prisma.InputJsonValue,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 添加任务草稿到 Proposal
export async function addTaskDraft(
  proposalUuid: string,
  companyUuid: string,
  draft: Omit<TaskDraft, "uuid"> & { uuid?: string }
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.taskDrafts as unknown as TaskDraft[]) || [];
  const newDraft = ensureTaskDraftUuid(draft);
  const updatedDrafts = [...existingDrafts, newDraft];

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      taskDrafts: updatedDrafts as unknown as Prisma.InputJsonValue,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 更新文档草稿
export async function updateDocumentDraft(
  proposalUuid: string,
  companyUuid: string,
  draftUuid: string,
  updates: Partial<Omit<DocumentDraft, "uuid">>
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.documentDrafts as unknown as DocumentDraft[]) || [];
  const draftIndex = existingDrafts.findIndex(d => d.uuid === draftUuid);

  if (draftIndex === -1) {
    throw new Error("Document draft not found");
  }

  existingDrafts[draftIndex] = { ...existingDrafts[draftIndex], ...updates };

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      documentDrafts: existingDrafts as unknown as Prisma.InputJsonValue,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 更新任务草稿
export async function updateTaskDraft(
  proposalUuid: string,
  companyUuid: string,
  draftUuid: string,
  updates: Partial<Omit<TaskDraft, "uuid">>
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.taskDrafts as unknown as TaskDraft[]) || [];
  const draftIndex = existingDrafts.findIndex(d => d.uuid === draftUuid);

  if (draftIndex === -1) {
    throw new Error("Task draft not found");
  }

  existingDrafts[draftIndex] = { ...existingDrafts[draftIndex], ...updates };

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      taskDrafts: existingDrafts as unknown as Prisma.InputJsonValue,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 删除文档草稿
export async function removeDocumentDraft(
  proposalUuid: string,
  companyUuid: string,
  draftUuid: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.documentDrafts as unknown as DocumentDraft[]) || [];
  const updatedDrafts = existingDrafts.filter(d => d.uuid !== draftUuid);

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      documentDrafts: updatedDrafts.length > 0
        ? (updatedDrafts as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}

// 删除任务草稿
export async function removeTaskDraft(
  proposalUuid: string,
  companyUuid: string,
  draftUuid: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid, status: "draft" },
  });

  if (!proposal) {
    throw new Error("Proposal not found or not in draft status");
  }

  const existingDrafts = (proposal.taskDrafts as unknown as TaskDraft[]) || [];
  const updatedDrafts = existingDrafts.filter(d => d.uuid !== draftUuid);

  const updated = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      taskDrafts: updatedDrafts.length > 0
        ? (updatedDrafts as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(updated);
}
