// src/app/api/tasks/[uuid]/claim/route.ts
// Tasks API - 认领 Task (PRD §3.3.1 认领规则)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAgent, isDeveloperAgent } from "@/lib/auth";
import { getTaskByUuid, claimTask } from "@/services/task.service";
import { AlreadyClaimedError } from "@/lib/errors";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/tasks/[uuid]/claim - 认领 Task
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;

    const task = await getTaskByUuid(auth.companyUuid, uuid);
    if (!task) {
      return errors.notFound("Task");
    }

    let assigneeType: string;
    let assigneeUuid: string;
    let assignedByUuid: string | null = null;

    if (isAgent(auth)) {
      // Agent 认领 - Developer Agent 可以认领
      if (!isDeveloperAgent(auth)) {
        return errors.forbidden("Only developer agents can claim tasks");
      }
      assigneeType = "agent";
      assigneeUuid = auth.actorUuid;
    } else if (isUser(auth)) {
      // 用户认领 - 可以选择分配给自己或特定 Agent
      const body = await parseBody<{
        assignToSelf?: boolean;
        agentUuid?: string;
      }>(request);

      if (body.agentUuid) {
        // 分配给特定 Agent（通过 UUID）
        const agent = await prisma.agent.findFirst({
          where: {
            uuid: body.agentUuid,
            companyUuid: auth.companyUuid,
            roles: { has: "developer" }, // 只能分配给 Developer Agent
          },
        });

        if (!agent) {
          return errors.notFound("Developer Agent");
        }

        assigneeType = "agent";
        assigneeUuid = agent.uuid;
        assignedByUuid = auth.actorUuid;
      } else {
        // 分配给自己（所有自己的 Developer Agent 都能处理）
        assigneeType = "user";
        assigneeUuid = auth.actorUuid;
        assignedByUuid = auth.actorUuid;
      }
    } else {
      return errors.forbidden("Invalid authentication context");
    }

    try {
      const updated = await claimTask({
        taskUuid: task.uuid,
        companyUuid: auth.companyUuid,
        assigneeType,
        assigneeUuid,
        assignedByUuid,
      });

      return success(updated);
    } catch (e) {
      if (e instanceof AlreadyClaimedError) {
        return errors.alreadyClaimed();
      }
      throw e;
    }
  }
);
