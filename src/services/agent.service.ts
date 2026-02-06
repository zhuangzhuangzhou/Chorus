// src/services/agent.service.ts
// Agent 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";

export interface AgentListParams {
  companyUuid: string;
  skip: number;
  take: number;
}

export interface AgentCreateParams {
  companyUuid: string;
  name: string;
  roles: string[];
  ownerUuid: string;
  persona?: string | null;
  systemPrompt?: string | null;
}

export interface AgentUpdateParams {
  name?: string;
  roles?: string[];
  persona?: string | null;
  systemPrompt?: string | null;
}

export interface ApiKeyCreateParams {
  companyUuid: string;
  agentUuid: string;
  name?: string | null;
  expiresAt?: Date | null;
}

// Agents 列表查询
export async function listAgents({ companyUuid, skip, take }: AgentListParams) {
  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where: { companyUuid },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        name: true,
        roles: true,
        persona: true,
        ownerUuid: true,
        lastActiveAt: true,
        createdAt: true,
        _count: { select: { apiKeys: true } },
      },
    }),
    prisma.agent.count({ where: { companyUuid } }),
  ]);

  return { agents, total };
}

// 获取 Agent 详情
export async function getAgent(companyUuid: string, uuid: string) {
  return prisma.agent.findFirst({
    where: { uuid, companyUuid },
    include: {
      apiKeys: {
        where: { revokedAt: null },
        select: {
          uuid: true,
          keyPrefix: true,
          name: true,
          lastUsed: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });
}

// 通过 UUID 获取 Agent（验证用）
export async function getAgentByUuid(companyUuid: string, uuid: string) {
  return prisma.agent.findFirst({
    where: { uuid, companyUuid },
    select: { uuid: true, name: true, roles: true },
  });
}

// 创建 Agent
export async function createAgent({
  companyUuid,
  name,
  roles,
  ownerUuid,
  persona,
  systemPrompt,
}: AgentCreateParams) {
  return prisma.agent.create({
    data: { companyUuid, name, roles, ownerUuid, persona, systemPrompt },
    select: {
      uuid: true,
      name: true,
      roles: true,
      persona: true,
      systemPrompt: true,
      ownerUuid: true,
      createdAt: true,
    },
  });
}

// 更新 Agent (by UUID)
export async function updateAgent(uuid: string, data: AgentUpdateParams) {
  return prisma.agent.update({
    where: { uuid },
    data,
    select: {
      uuid: true,
      name: true,
      roles: true,
      persona: true,
      systemPrompt: true,
      ownerUuid: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });
}

// 删除 Agent (by UUID)
export async function deleteAgent(uuid: string) {
  return prisma.agent.delete({ where: { uuid } });
}

// 列出 API Keys
export async function listApiKeys(companyUuid: string, skip: number, take: number) {
  const where = { companyUuid, revokedAt: null };

  const [apiKeys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { uuid: true, name: true, roles: true } },
      },
    }),
    prisma.apiKey.count({ where }),
  ]);

  return { apiKeys, total };
}

// 创建 API Key (UUID-based)
export async function createApiKey({
  companyUuid,
  agentUuid,
  name,
  expiresAt,
}: ApiKeyCreateParams) {
  const { key, hash, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      companyUuid,
      agentUuid,
      keyHash: hash,
      keyPrefix: prefix,
      name,
      expiresAt,
    },
    select: {
      uuid: true,
      keyPrefix: true,
      name: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // 返回明文 key（只有创建时能看到）
  return { ...apiKey, key };
}

// 获取 API Key 详情
export async function getApiKey(companyUuid: string, uuid: string) {
  return prisma.apiKey.findFirst({
    where: { uuid, companyUuid },
    select: { uuid: true, revokedAt: true },
  });
}

// 撤销 API Key (by UUID)
export async function revokeApiKey(uuid: string) {
  return prisma.apiKey.update({
    where: { uuid },
    data: { revokedAt: new Date() },
  });
}

// 获取用户拥有的 Agents (for claim modal)
export async function getAgentsByOwner(companyUuid: string, ownerUuid: string) {
  return prisma.agent.findMany({
    where: { companyUuid, ownerUuid },
    select: {
      uuid: true,
      name: true,
      roles: true,
    },
    orderBy: { name: "asc" },
  });
}

// 获取公司内所有指定角色的 Agents (for assignment)
export async function getAgentsByRole(companyUuid: string, role: string) {
  return prisma.agent.findMany({
    where: {
      companyUuid,
      roles: { has: role },
    },
    select: {
      uuid: true,
      name: true,
      roles: true,
      ownerUuid: true,
    },
    orderBy: { name: "asc" },
  });
}

// 获取公司内所有用户 (for assignment)
export async function getCompanyUsers(companyUuid: string) {
  return prisma.user.findMany({
    where: { companyUuid },
    select: {
      uuid: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });
}
