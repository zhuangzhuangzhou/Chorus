// src/mcp/tools/developer.ts
// Developer Agent 专属 MCP 工具 (ARCHITECTURE.md §5.2)
// UUID-Based Architecture: All operations use UUIDs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentAuthContext } from "@/types/auth";
import * as taskService from "@/services/task.service";
import * as activityService from "@/services/activity.service";
import * as commentService from "@/services/comment.service";
import * as sessionService from "@/services/session.service";
import { AlreadyClaimedError, NotClaimedError } from "@/lib/errors";

export function registerDeveloperTools(server: McpServer, auth: AgentAuthContext) {
  // chorus_claim_task - 认领 Task
  server.registerTool(
    "chorus_claim_task",
    {
      description: "认领一个 Task（open → assigned）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      try {
        const updated = await taskService.claimTask({
          taskUuid: task.uuid,
          companyUuid: auth.companyUuid,
          assigneeType: "agent",
          assigneeUuid: auth.actorUuid,
        });

        await activityService.createActivity({
          companyUuid: auth.companyUuid,
          projectUuid: task.projectUuid,
          targetType: "task",
          targetUuid: task.uuid,
          actorType: "agent",
          actorUuid: auth.actorUuid,
          action: "assigned",
          value: { assigneeType: "agent", assigneeUuid: auth.actorUuid },
        });

        return {
          content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
        };
      } catch (e) {
        if (e instanceof AlreadyClaimedError) {
          return { content: [{ type: "text", text: "只能认领 open 状态的 Task" }], isError: true };
        }
        throw e;
      }
    }
  );

  // chorus_release_task - 放弃认领 Task
  server.registerTool(
    "chorus_release_task",
    {
      description: "放弃认领 Task（assigned → open）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (task.assigneeType === "agent" && task.assigneeUuid === auth.actorUuid) ||
        (task.assigneeType === "user" && auth.ownerUuid && task.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以放弃认领" }], isError: true };
      }

      try {
        const updated = await taskService.releaseTask(task.uuid);

        await activityService.createActivity({
          companyUuid: auth.companyUuid,
          projectUuid: task.projectUuid,
          targetType: "task",
          targetUuid: task.uuid,
          actorType: "agent",
          actorUuid: auth.actorUuid,
          action: "released",
        });

        return {
          content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
        };
      } catch (e) {
        if (e instanceof NotClaimedError) {
          return { content: [{ type: "text", text: "只能放弃 assigned 状态的 Task" }], isError: true };
        }
        throw e;
      }
    }
  );

  // chorus_update_task - 更新任务状态
  server.registerTool(
    "chorus_update_task",
    {
      description: "更新任务状态（仅认领者可操作）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
        status: z.enum(["in_progress", "to_verify"]).describe("新状态"),
        sessionUuid: z.string().optional().describe("Session UUID (for sub-agent identification)"),
      }),
    },
    async ({ taskUuid, status, sessionUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (task.assigneeType === "agent" && task.assigneeUuid === auth.actorUuid) ||
        (task.assigneeType === "user" && auth.ownerUuid && task.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以更新状态" }], isError: true };
      }

      // 解析 session 信息
      let sessionName: string | undefined;
      if (sessionUuid) {
        const session = await sessionService.getSession(auth.companyUuid, sessionUuid);
        if (session && session.agentUuid === auth.actorUuid) {
          sessionName = session.name;
          await sessionService.heartbeatSession(auth.companyUuid, sessionUuid);
        }
      }

      // 验证状态转换
      if (!taskService.isValidTaskStatusTransition(task.status, status)) {
        return {
          content: [{ type: "text", text: `无效的状态转换: ${task.status} → ${status}` }],
          isError: true,
        };
      }

      const updated = await taskService.updateTask(task.uuid, { status });

      await activityService.createActivity({
        companyUuid: auth.companyUuid,
        projectUuid: task.projectUuid,
        targetType: "task",
        targetUuid: task.uuid,
        actorType: "agent",
        actorUuid: auth.actorUuid,
        action: "status_changed",
        value: { status },
        sessionUuid,
        sessionName,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_submit_for_verify - 提交任务等待人类验证
  server.registerTool(
    "chorus_submit_for_verify",
    {
      description: "提交任务等待人类验证（in_progress → to_verify）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
        summary: z.string().optional().describe("工作摘要"),
      }),
    },
    async ({ taskUuid, summary }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (task.assigneeType === "agent" && task.assigneeUuid === auth.actorUuid) ||
        (task.assigneeType === "user" && auth.ownerUuid && task.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以提交验证" }], isError: true };
      }

      if (task.status !== "in_progress") {
        return { content: [{ type: "text", text: "只能从 in_progress 状态提交验证" }], isError: true };
      }

      const updated = await taskService.updateTask(task.uuid, { status: "to_verify" });

      // 记录活动
      await activityService.createActivity({
        companyUuid: auth.companyUuid,
        projectUuid: task.projectUuid,
        targetType: "task",
        targetUuid: task.uuid,
        actorType: "agent",
        actorUuid: auth.actorUuid,
        action: "submitted",
        value: summary ? { summary } : undefined,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_report_work - 报告工作完成
  server.registerTool(
    "chorus_report_work",
    {
      description: "报告工作进展或完成情况",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
        report: z.string().describe("工作报告内容"),
        status: z.enum(["in_progress", "to_verify"]).optional().describe("可选：同时更新状态"),
        sessionUuid: z.string().optional().describe("Session UUID (for sub-agent identification)"),
      }),
    },
    async ({ taskUuid, report, status, sessionUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (task.assigneeType === "agent" && task.assigneeUuid === auth.actorUuid) ||
        (task.assigneeType === "user" && auth.ownerUuid && task.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以报告工作" }], isError: true };
      }

      // 解析 session 信息
      let sessionName: string | undefined;
      if (sessionUuid) {
        const session = await sessionService.getSession(auth.companyUuid, sessionUuid);
        if (session && session.agentUuid === auth.actorUuid) {
          sessionName = session.name;
          await sessionService.heartbeatSession(auth.companyUuid, sessionUuid);
        }
      }

      // 如果需要更新状态
      if (status && taskService.isValidTaskStatusTransition(task.status, status)) {
        await taskService.updateTask(task.uuid, { status });
      }

      // 写入评论
      await commentService.createComment({
        companyUuid: auth.companyUuid,
        targetType: "task",
        targetUuid: task.uuid,
        content: report,
        authorType: "agent",
        authorUuid: auth.actorUuid,
      });

      // 记录活动
      await activityService.createActivity({
        companyUuid: auth.companyUuid,
        projectUuid: task.projectUuid,
        targetType: "task",
        targetUuid: task.uuid,
        actorType: "agent",
        actorUuid: auth.actorUuid,
        action: "comment_added",
        value: { report, statusUpdated: status || null },
        sessionUuid,
        sessionName,
      });

      return {
        content: [{ type: "text", text: `工作报告已记录: ${report}` }],
      };
    }
  );
}
