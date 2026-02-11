// src/app/api/tasks/[uuid]/release/route.ts
// Tasks API - 放弃认领 Task (PRD §3.3.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAssignee } from "@/lib/auth";
import { getTaskByUuid, releaseTask } from "@/services/task.service";
import { NotClaimedError } from "@/lib/errors";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/tasks/[uuid]/release - 放弃认领 Task
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

    // 检查权限：用户可以释放任何 Task，Agent 只能释放自己认领的
    if (!isUser(auth)) {
      if (!isAssignee(auth, task.assigneeType, task.assigneeUuid)) {
        return errors.permissionDenied("Only assignee can release this task");
      }
    }

    try {
      const updated = await releaseTask(task.uuid);
      return success(updated);
    } catch (e) {
      if (e instanceof NotClaimedError) {
        return errors.badRequest("Can only release tasks with assigned status");
      }
      throw e;
    }
  }
);
