// src/app/api/projects/[uuid]/tasks/dependencies/route.ts
// Project Task Dependencies API - DAG 可视化数据

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import { getProjectTaskDependencies } from "@/services/task.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/tasks/dependencies - 获取项目任务依赖关系（DAG）
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid: projectUuid } = await context.params;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const dag = await getProjectTaskDependencies(auth.companyUuid, projectUuid);
    return success(dag);
  }
);
