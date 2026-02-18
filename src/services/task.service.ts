// src/services/task.service.ts
// Task 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { formatAssigneeComplete, formatCreatedBy } from "@/lib/uuid-resolver";
import { eventBus } from "@/lib/event-bus";
import { AlreadyClaimedError, NotClaimedError, isPrismaNotFound } from "@/lib/errors";
import { batchCommentCounts } from "@/services/comment.service";

// ===== 类型定义 =====

export interface TaskListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  status?: string;
  priority?: string;
}

export interface TaskCreateParams {
  companyUuid: string;
  projectUuid: string;
  title: string;
  description?: string | null;
  priority?: string;
  storyPoints?: number | null;
  acceptanceCriteria?: string | null;  // 验收标准
  proposalUuid?: string | null;
  createdByUuid: string;
}

export interface TaskClaimParams {
  taskUuid: string;
  companyUuid: string;
  assigneeType: string;
  assigneeUuid: string;
  assignedByUuid?: string | null;
}

export interface TaskUpdateParams {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  storyPoints?: number | null;
  acceptanceCriteria?: string | null;  // 验收标准
}

// 依赖关系简要信息
export interface TaskDependencyInfo {
  uuid: string;
  title: string;
  status: string;
}

// API 响应格式
export interface TaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  acceptanceCriteria: string | null;  // 验收标准
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
  proposalUuid: string | null;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  dependsOn: TaskDependencyInfo[];
  dependedBy: TaskDependencyInfo[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Task 状态转换规则 (ARCHITECTURE.md §7.2)
export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["assigned", "closed"],
  assigned: ["open", "in_progress", "closed"],
  in_progress: ["to_verify", "closed"],
  to_verify: ["done", "in_progress", "closed"],
  done: ["closed"],
  closed: [],
};

// 验证状态转换是否有效
export function isValidTaskStatusTransition(from: string, to: string): boolean {
  const allowed = TASK_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ===== 内部辅助函数 =====

// 格式化单个 Task 为 API 响应格式
async function formatTaskResponse(
  task: {
    uuid: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    storyPoints: number | null;
    acceptanceCriteria: string | null;
    assigneeType: string | null;
    assigneeUuid: string | null;
    assignedAt: Date | null;
    assignedByUuid: string | null;
    proposalUuid: string | null;
    createdByUuid: string;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
    dependsOn?: Array<{ dependsOn: { uuid: string; title: string; status: string } }>;
    dependedBy?: Array<{ task: { uuid: string; title: string; status: string } }>;
  },
  commentCount: number = 0,
): Promise<TaskResponse> {
  const [assignee, createdBy] = await Promise.all([
    formatAssigneeComplete(task.assigneeType, task.assigneeUuid, task.assignedAt, task.assignedByUuid),
    formatCreatedBy(task.createdByUuid),
  ]);

  const dependsOn: TaskDependencyInfo[] = (task.dependsOn || []).map((d) => ({
    uuid: d.dependsOn.uuid,
    title: d.dependsOn.title,
    status: d.dependsOn.status,
  }));

  const dependedBy: TaskDependencyInfo[] = (task.dependedBy || []).map((d) => ({
    uuid: d.task.uuid,
    title: d.task.title,
    status: d.task.status,
  }));

  return {
    uuid: task.uuid,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    storyPoints: task.storyPoints,
    acceptanceCriteria: task.acceptanceCriteria,
    assignee,
    proposalUuid: task.proposalUuid,
    ...(task.project && { project: task.project }),
    createdBy,
    dependsOn,
    dependedBy,
    commentCount,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// ===== 依赖关系 include 模板 =====

const dependencyInclude = {
  dependsOn: {
    select: {
      dependsOn: { select: { uuid: true, title: true, status: true } },
    },
  },
  dependedBy: {
    select: {
      task: { select: { uuid: true, title: true, status: true } },
    },
  },
} as const;

// ===== Service 方法 =====

// Tasks 列表查询
export async function listTasks({
  companyUuid,
  projectUuid,
  skip,
  take,
  status,
  priority,
}: TaskListParams): Promise<{ tasks: TaskResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    ...(status && { status }),
    ...(priority && { priority }),
  };

  const [rawTasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        storyPoints: true,
        acceptanceCriteria: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
        ...dependencyInclude,
      },
    }),
    prisma.task.count({ where }),
  ]);

  // Batch-fetch comment counts for all tasks in one query
  const commentCounts = await batchCommentCounts(
    companyUuid,
    "task",
    rawTasks.map((t) => t.uuid),
  );

  const tasks = await Promise.all(
    rawTasks.map((t) => formatTaskResponse(t, commentCounts[t.uuid] ?? 0)),
  );
  return { tasks, total };
}

// 获取 Task 详情
export async function getTask(
  companyUuid: string,
  uuid: string
): Promise<TaskResponse | null> {
  const task = await prisma.task.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
      ...dependencyInclude,
    },
  });

  if (!task) return null;

  const commentCount = await prisma.comment.count({
    where: { companyUuid, targetType: "task", targetUuid: uuid },
  });

  return formatTaskResponse(task, commentCount);
}

// 通过 UUID 获取 Task 原始数据（内部使用，用于权限检查等）
export async function getTaskByUuid(companyUuid: string, uuid: string) {
  return prisma.task.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Task
export async function createTask(params: TaskCreateParams): Promise<TaskResponse> {
  const task = await prisma.task.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      title: params.title,
      description: params.description,
      status: "open",
      priority: params.priority || "medium",
      storyPoints: params.storyPoints,
      acceptanceCriteria: params.acceptanceCriteria,
      proposalUuid: params.proposalUuid,
      createdByUuid: params.createdByUuid,
    },
    select: {
      uuid: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      storyPoints: true,
      acceptanceCriteria: true,
      assigneeType: true,
      assigneeUuid: true,
      assignedAt: true,
      assignedByUuid: true,
      proposalUuid: true,
      createdByUuid: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  eventBus.emitChange({ companyUuid: params.companyUuid, projectUuid: params.projectUuid, entityType: "task", entityUuid: task.uuid, action: "created" });

  return formatTaskResponse(task);
}

// 更新 Task
export async function updateTask(
  uuid: string,
  data: TaskUpdateParams
): Promise<TaskResponse> {
  const task = await prisma.task.update({
    where: { uuid },
    data,
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  eventBus.emitChange({ companyUuid: task.companyUuid, projectUuid: task.project.uuid, entityType: "task", entityUuid: task.uuid, action: "updated" });

  return formatTaskResponse(task);
}

// 认领 Task (atomic: only succeeds if status is "open")
export async function claimTask({
  taskUuid,
  companyUuid,
  assigneeType,
  assigneeUuid,
  assignedByUuid,
}: TaskClaimParams): Promise<TaskResponse> {
  try {
    const task = await prisma.task.update({
      where: { uuid: taskUuid, status: "open" },
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

    eventBus.emitChange({ companyUuid: task.companyUuid, projectUuid: task.project.uuid, entityType: "task", entityUuid: task.uuid, action: "updated" });

    return formatTaskResponse(task);
  } catch (e: unknown) {
    if (isPrismaNotFound(e)) {
      throw new AlreadyClaimedError("Task");
    }
    throw e;
  }
}

// 放弃认领 Task (atomic: only succeeds if status is "assigned")
export async function releaseTask(uuid: string): Promise<TaskResponse> {
  try {
    const task = await prisma.task.update({
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

    eventBus.emitChange({ companyUuid: task.companyUuid, projectUuid: task.project.uuid, entityType: "task", entityUuid: task.uuid, action: "updated" });

    return formatTaskResponse(task);
  } catch (e: unknown) {
    if (isPrismaNotFound(e)) {
      throw new NotClaimedError("Task");
    }
    throw e;
  }
}

// 删除 Task
export async function deleteTask(uuid: string) {
  const task = await prisma.task.delete({ where: { uuid } });
  eventBus.emitChange({ companyUuid: task.companyUuid, projectUuid: task.projectUuid, entityType: "task", entityUuid: task.uuid, action: "deleted" });
  return task;
}

// 批量创建 Tasks（用于 Proposal 审批）
// 接受带 draftUuid 的任务列表，返回 { tasks, draftToTaskUuidMap }
export async function createTasksFromProposal(
  companyUuid: string,
  projectUuid: string,
  proposalUuid: string,
  createdByUuid: string,
  tasks: Array<{ uuid?: string; title: string; description?: string; priority?: string; storyPoints?: number; acceptanceCriteria?: string }>
): Promise<{ tasks: TaskResponse[]; draftToTaskUuidMap: Map<string, string> }> {
  const draftToTaskUuidMap = new Map<string, string>();

  const createPromises = tasks.map((task) =>
    prisma.task.create({
      data: {
        companyUuid,
        projectUuid,
        title: task.title,
        description: task.description || null,
        status: "open",
        priority: task.priority || "medium",
        storyPoints: task.storyPoints || null,
        acceptanceCriteria: task.acceptanceCriteria || null,
        proposalUuid,
        createdByUuid,
      },
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        storyPoints: true,
        acceptanceCriteria: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  );

  const rawTasks = await Promise.all(createPromises);

  // Build draftUuid → taskUuid mapping
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].uuid) {
      draftToTaskUuidMap.set(tasks[i].uuid!, rawTasks[i].uuid);
    }
  }

  const formattedTasks = await Promise.all(rawTasks.map(formatTaskResponse));
  return { tasks: formattedTasks, draftToTaskUuidMap };
}

// ===== 依赖关系管理 =====

// DFS 环检测：检查从 startUuid 出发是否可以经过已有边到达 targetUuid
async function wouldCreateCycle(
  startUuid: string,
  targetUuid: string
): Promise<boolean> {
  // 获取项目内所有依赖边
  const allDeps = await prisma.taskDependency.findMany({
    select: { taskUuid: true, dependsOnUuid: true },
  });

  // 构建邻接表：taskUuid 依赖 dependsOnUuid
  // 如果添加 edge: taskUuid=targetUuid -> dependsOnUuid=startUuid
  // 需要检查 startUuid 是否可以通过已有边到达 targetUuid
  const adjacency = new Map<string, string[]>();
  for (const dep of allDeps) {
    if (!adjacency.has(dep.taskUuid)) {
      adjacency.set(dep.taskUuid, []);
    }
    adjacency.get(dep.taskUuid)!.push(dep.dependsOnUuid);
  }

  // DFS from startUuid following existing edges (taskUuid -> dependsOnUuid)
  const visited = new Set<string>();
  const stack = [startUuid];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === targetUuid) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}

// 添加任务依赖
export async function addTaskDependency(
  companyUuid: string,
  taskUuid: string,
  dependsOnUuid: string
): Promise<{ taskUuid: string; dependsOnUuid: string; createdAt: Date }> {
  // 不能自依赖
  if (taskUuid === dependsOnUuid) {
    throw new Error("A task cannot depend on itself");
  }

  // 验证两个任务都存在且属于同一项目
  const [task, dependsOnTask] = await Promise.all([
    prisma.task.findFirst({ where: { uuid: taskUuid, companyUuid } }),
    prisma.task.findFirst({ where: { uuid: dependsOnUuid, companyUuid } }),
  ]);

  if (!task) throw new Error("Task not found");
  if (!dependsOnTask) throw new Error("Dependency task not found");

  if (task.projectUuid !== dependsOnTask.projectUuid) {
    throw new Error("Tasks must belong to the same project");
  }

  // 环检测：如果添加 taskUuid -> dependsOnUuid 的边，
  // 检查 dependsOnUuid 是否能沿着已有边到达 taskUuid（形成环）
  const cycleDetected = await wouldCreateCycle(dependsOnUuid, taskUuid);
  if (cycleDetected) {
    throw new Error("Adding this dependency would create a cycle");
  }

  const dep = await prisma.taskDependency.create({
    data: { taskUuid, dependsOnUuid },
  });

  return { taskUuid: dep.taskUuid, dependsOnUuid: dep.dependsOnUuid, createdAt: dep.createdAt };
}

// 删除任务依赖
export async function removeTaskDependency(
  companyUuid: string,
  taskUuid: string,
  dependsOnUuid: string
): Promise<void> {
  // 验证任务属于该公司
  const task = await prisma.task.findFirst({ where: { uuid: taskUuid, companyUuid } });
  if (!task) throw new Error("Task not found");

  await prisma.taskDependency.deleteMany({
    where: { taskUuid, dependsOnUuid },
  });
}

// 获取任务的依赖关系
export async function getTaskDependencies(
  companyUuid: string,
  taskUuid: string
): Promise<{ dependsOn: TaskDependencyInfo[]; dependedBy: TaskDependencyInfo[] }> {
  const task = await prisma.task.findFirst({
    where: { uuid: taskUuid, companyUuid },
    include: dependencyInclude,
  });

  if (!task) throw new Error("Task not found");

  return {
    dependsOn: task.dependsOn.map((d) => ({
      uuid: d.dependsOn.uuid,
      title: d.dependsOn.title,
      status: d.dependsOn.status,
    })),
    dependedBy: task.dependedBy.map((d) => ({
      uuid: d.task.uuid,
      title: d.task.title,
      status: d.task.status,
    })),
  };
}

// 获取已解锁的任务（所有依赖都已完成）
export async function getUnblockedTasks({
  companyUuid,
  projectUuid,
}: {
  companyUuid: string;
  projectUuid: string;
}): Promise<{ tasks: TaskResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    status: { in: ["open", "assigned"] },
    // Exclude tasks that have any dependency NOT in done/to_verify
    NOT: {
      dependsOn: {
        some: {
          dependsOn: {
            status: { notIn: ["done", "to_verify"] },
          },
        },
      },
    },
  };

  const [rawTasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        storyPoints: true,
        acceptanceCriteria: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
        ...dependencyInclude,
      },
    }),
    prisma.task.count({ where }),
  ]);

  const commentCounts = await batchCommentCounts(
    companyUuid,
    "task",
    rawTasks.map((t) => t.uuid),
  );

  const tasks = await Promise.all(
    rawTasks.map((t) => formatTaskResponse(t, commentCounts[t.uuid] ?? 0)),
  );
  return { tasks, total };
}

// 获取项目内所有任务依赖关系（DAG 可视化）
export async function getProjectTaskDependencies(
  companyUuid: string,
  projectUuid: string
): Promise<{
  nodes: Array<{ uuid: string; title: string; status: string; priority: string }>;
  edges: Array<{ from: string; to: string }>;
}> {
  const [tasks, dependencies] = await Promise.all([
    prisma.task.findMany({
      where: { companyUuid, projectUuid },
      select: { uuid: true, title: true, status: true, priority: true },
    }),
    prisma.taskDependency.findMany({
      where: {
        task: { companyUuid, projectUuid },
      },
      select: { taskUuid: true, dependsOnUuid: true },
    }),
  ]);

  return {
    nodes: tasks.map((t) => ({
      uuid: t.uuid,
      title: t.title,
      status: t.status,
      priority: t.priority,
    })),
    edges: dependencies.map((d) => ({
      from: d.taskUuid,
      to: d.dependsOnUuid,
    })),
  };
}
