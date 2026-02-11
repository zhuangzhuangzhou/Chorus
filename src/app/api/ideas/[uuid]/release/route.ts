// src/app/api/ideas/[uuid]/release/route.ts
// Ideas API - 放弃认领 Idea (PRD §4.1 F5)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAssignee } from "@/lib/auth";
import { getIdeaByUuid, releaseIdea } from "@/services/idea.service";
import { NotClaimedError } from "@/lib/errors";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/ideas/[uuid]/release - 放弃认领 Idea
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

    // 检查权限：用户可以释放任何 Idea，Agent 只能释放自己认领的
    if (!isUser(auth)) {
      if (!isAssignee(auth, idea.assigneeType, idea.assigneeUuid)) {
        return errors.permissionDenied("Only assignee can release this idea");
      }
    }

    try {
      const updated = await releaseIdea(idea.uuid);
      return success(updated);
    } catch (e) {
      if (e instanceof NotClaimedError) {
        return errors.badRequest("Can only release ideas with assigned status");
      }
      throw e;
    }
  }
);
