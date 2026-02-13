// src/services/project.service.ts
// Project 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";

export interface ProjectListParams {
  companyUuid: string;
  skip: number;
  take: number;
}

export interface ProjectCreateParams {
  companyUuid: string;
  name: string;
  description?: string | null;
}

export interface ProjectUpdateParams {
  name?: string;
  description?: string | null;
}

// 项目列表查询
export async function listProjects({ companyUuid, skip, take }: ProjectListParams) {
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { companyUuid },
      skip,
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        uuid: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ideas: true,
            documents: true,
            tasks: true,
            proposals: true,
          },
        },
      },
    }),
    prisma.project.count({ where: { companyUuid } }),
  ]);

  return { projects, total };
}

// 获取项目详情
export async function getProject(companyUuid: string, uuid: string) {
  return prisma.project.findFirst({
    where: { uuid, companyUuid },
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          ideas: true,
          documents: true,
          tasks: true,
          proposals: true,
          activities: true,
        },
      },
    },
  });
}

// 验证项目是否存在
export async function projectExists(companyUuid: string, projectUuid: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { uuid: projectUuid, companyUuid },
    select: { uuid: true },
  });
  return !!project;
}

// 通过 UUID 获取项目基本信息
export async function getProjectByUuid(companyUuid: string, uuid: string) {
  return prisma.project.findFirst({
    where: { uuid, companyUuid },
    select: { uuid: true, name: true },
  });
}

// 创建项目
export async function createProject({ companyUuid, name, description }: ProjectCreateParams) {
  return prisma.project.create({
    data: { companyUuid, name, description },
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// 更新项目
export async function updateProject(uuid: string, data: ProjectUpdateParams) {
  return prisma.project.update({
    where: { uuid },
    data,
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// 删除项目
export async function deleteProject(uuid: string) {
  return prisma.project.delete({ where: { uuid } });
}

// 获取公司级别的概览统计（用于 Projects 列表页）
export async function getCompanyOverviewStats(companyUuid: string) {
  const [projectCount, taskCount, openProposalCount, ideaCount] = await Promise.all([
    prisma.project.count({ where: { companyUuid } }),
    prisma.task.count({ where: { companyUuid } }),
    prisma.proposal.count({ where: { companyUuid, status: "pending" } }),
    prisma.idea.count({ where: { companyUuid } }),
  ]);

  return {
    projects: projectCount,
    tasks: taskCount,
    openProposals: openProposalCount,
    ideas: ideaCount,
  };
}

// 获取项目列表（含任务完成率，用于 Projects 列表页）
export async function listProjectsWithStats({ companyUuid, skip, take }: ProjectListParams) {
  const { projects, total } = await listProjects({ companyUuid, skip, take });

  // 批量查询每个项目的已完成任务数
  const projectUuids = projects.map((p) => p.uuid);
  const doneCounts = await prisma.task.groupBy({
    by: ["projectUuid"],
    where: { companyUuid, projectUuid: { in: projectUuids }, status: "done" },
    _count: true,
  });
  const doneMap = new Map(doneCounts.map((d) => [d.projectUuid, d._count]));

  return {
    projects: projects.map((p) => ({
      ...p,
      tasksDone: doneMap.get(p.uuid) || 0,
    })),
    total,
  };
}

// 获取项目统计数据（用于 Dashboard）
export async function getProjectStats(companyUuid: string, projectUuid: string) {
  const [ideasStats, tasksStats, proposalsStats, documentsCount] = await Promise.all([
    // Ideas 统计
    prisma.idea.groupBy({
      by: ["status"],
      where: { projectUuid, companyUuid },
      _count: true,
    }),
    // Tasks 统计
    prisma.task.groupBy({
      by: ["status"],
      where: { projectUuid, companyUuid },
      _count: true,
    }),
    // Proposals 统计
    prisma.proposal.groupBy({
      by: ["status"],
      where: { projectUuid, companyUuid },
      _count: true,
    }),
    // Documents 总数
    prisma.document.count({
      where: { projectUuid, companyUuid },
    }),
  ]);

  // 解析 Ideas 统计
  const ideaStatusMap = new Map(ideasStats.map((s) => [s.status, s._count]));
  const ideasTotal = ideasStats.reduce((sum, s) => sum + s._count, 0);
  const ideasOpen = ideaStatusMap.get("open") || 0;

  // 解析 Tasks 统计
  const taskStatusMap = new Map(tasksStats.map((s) => [s.status, s._count]));
  const tasksTotal = tasksStats.reduce((sum, s) => sum + s._count, 0);
  const tasksInProgress = taskStatusMap.get("in_progress") || 0;

  // 解析 Proposals 统计
  const proposalStatusMap = new Map(proposalsStats.map((s) => [s.status, s._count]));
  const proposalsTotal = proposalsStats.reduce((sum, s) => sum + s._count, 0);
  const proposalsPending = proposalStatusMap.get("pending") || 0;

  return {
    ideas: { total: ideasTotal, open: ideasOpen },
    tasks: { total: tasksTotal, inProgress: tasksInProgress },
    proposals: { total: proposalsTotal, pending: proposalsPending },
    documents: { total: documentsCount },
  };
}
