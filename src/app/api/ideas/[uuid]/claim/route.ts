// src/app/api/ideas/[uuid]/claim/route.ts
// Ideas API - 认领 Idea (PRD §4.1 F5 认领规则)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAgent, isPmAgent } from "@/lib/auth";
import { getIdeaByUuid, claimIdea } from "@/services/idea.service";
import { AlreadyClaimedError } from "@/lib/errors";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/ideas/[uuid]/claim - 认领 Idea
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;

    const idea = await getIdeaByUuid(auth.companyUuid, uuid);
    if (!idea) {
      return errors.notFound("Idea");
    }

    let assigneeType: string;
    let assigneeUuid: string;
    let assignedByUuid: string | null = null;

    if (isAgent(auth)) {
      // Agent 认领 - 必须是 PM Agent
      if (!isPmAgent(auth)) {
        return errors.forbidden("Only PM agents can claim ideas");
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
            roles: { has: "pm" }, // 只能分配给 PM Agent
          },
        });

        if (!agent) {
          return errors.notFound("PM Agent");
        }

        assigneeType = "agent";
        assigneeUuid = agent.uuid;
        assignedByUuid = auth.actorUuid;
      } else {
        // 分配给自己（所有自己的 PM Agent 都能处理）
        assigneeType = "user";
        assigneeUuid = auth.actorUuid;
        assignedByUuid = auth.actorUuid;
      }
    } else {
      return errors.forbidden("Invalid authentication context");
    }

    try {
      const updated = await claimIdea({
        ideaUuid: idea.uuid,
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
