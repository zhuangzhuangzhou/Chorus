// src/app/api/tasks/[uuid]/dependencies/[dependsOnUuid]/route.ts
// Task Dependency DELETE API - 删除依赖

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";
import { getTaskByUuid, removeTaskDependency } from "@/services/task.service";

type RouteContext = { params: Promise<{ uuid: string; dependsOnUuid: string }> };

// DELETE /api/tasks/[uuid]/dependencies/[dependsOnUuid] - 删除依赖
export const DELETE = withErrorHandler<{ uuid: string; dependsOnUuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid, dependsOnUuid } = await context.params;

    // 验证任务存在
    const task = await getTaskByUuid(auth.companyUuid, uuid);
    if (!task) {
      return errors.notFound("Task");
    }

    await removeTaskDependency(auth.companyUuid, uuid, dependsOnUuid);
    return success({ deleted: true });
  }
);
