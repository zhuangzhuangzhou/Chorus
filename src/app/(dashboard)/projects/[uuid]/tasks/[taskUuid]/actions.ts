"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/lib/auth-server";
import { claimTask, getTaskByUuid, updateTask } from "@/services/task.service";
import { getAgentsByRole, getCompanyUsers } from "@/services/agent.service";

export async function claimTaskAction(taskUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 验证 task 存在且属于该公司
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // 只有 open 状态的 task 可以被认领
    if (task.status !== "open") {
      return { success: false, error: "Task is not available for claiming" };
    }

    await claimTask({
      taskUuid,
      companyUuid: auth.companyUuid,
      assigneeType: auth.type,
      assigneeUuid: auth.actorUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${task.projectUuid}/tasks/${taskUuid}`);
    revalidatePath(`/projects/${task.projectUuid}/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to claim task:", error);
    return { success: false, error: "Failed to claim task" };
  }
}

// Claim task to a specific agent
export async function claimTaskToAgentAction(taskUuid: string, agentUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    if (task.status !== "open") {
      return { success: false, error: "Task is not available for claiming" };
    }

    await claimTask({
      taskUuid,
      companyUuid: auth.companyUuid,
      assigneeType: "agent",
      assigneeUuid: agentUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${task.projectUuid}/tasks/${taskUuid}`);
    revalidatePath(`/projects/${task.projectUuid}/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to claim task to agent:", error);
    return { success: false, error: "Failed to claim task" };
  }
}

export async function updateTaskStatusAction(taskUuid: string, newStatus: string) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 验证 task 存在且属于该公司
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await updateTask(taskUuid, { status: newStatus });

    revalidatePath(`/projects/${task.projectUuid}/tasks/${taskUuid}`);
    revalidatePath(`/projects/${task.projectUuid}/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update task status:", error);
    return { success: false, error: "Failed to update task status" };
  }
}

// Verify task (to_verify -> done) - Human only
export async function verifyTaskAction(taskUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { success: false, error: "Only humans can verify tasks" };
  }

  try {
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    if (task.status !== "to_verify") {
      return { success: false, error: "Task is not in to_verify status" };
    }

    await updateTask(taskUuid, { status: "done" });

    revalidatePath(`/projects/${task.projectUuid}/tasks/${taskUuid}`);
    revalidatePath(`/projects/${task.projectUuid}/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to verify task:", error);
    return { success: false, error: "Failed to verify task" };
  }
}

// Assign task to another user
export async function claimTaskToUserAction(taskUuid: string, userUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    if (task.status !== "open") {
      return { success: false, error: "Task is not available for assigning" };
    }

    await claimTask({
      taskUuid,
      companyUuid: auth.companyUuid,
      assigneeType: "user",
      assigneeUuid: userUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${task.projectUuid}/tasks/${taskUuid}`);
    revalidatePath(`/projects/${task.projectUuid}/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to assign task to user:", error);
    return { success: false, error: "Failed to assign task" };
  }
}

// Get developer agents and users (for assign modal)
export async function getDeveloperAgentsAction() {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { agents: [], users: [] };
  }

  try {
    const agents = await getAgentsByRole(auth.companyUuid, "developer");
    const users = await getCompanyUsers(auth.companyUuid);
    return {
      agents,
      users,
      currentUserUuid: auth.actorUuid
    };
  } catch (error) {
    console.error("Failed to get developer agents:", error);
    return { agents: [], users: [] };
  }
}
