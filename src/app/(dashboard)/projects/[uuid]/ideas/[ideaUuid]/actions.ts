"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/lib/auth-server";
import { claimIdea, getIdeaByUuid } from "@/services/idea.service";
import { getAgentsByRole, getCompanyUsers } from "@/services/agent.service";

export async function claimIdeaAction(ideaUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 验证 idea 存在且属于该公司
    const idea = await getIdeaByUuid(auth.companyUuid, ideaUuid);
    if (!idea) {
      return { success: false, error: "Idea not found" };
    }

    // 只有 open 状态的 idea 可以被认领
    if (idea.status !== "open") {
      return { success: false, error: "Idea is not available for claiming" };
    }

    await claimIdea({
      ideaUuid,
      companyUuid: auth.companyUuid,
      assigneeType: auth.type,
      assigneeUuid: auth.actorUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${idea.projectUuid}/ideas/${ideaUuid}`);
    revalidatePath(`/projects/${idea.projectUuid}/ideas`);

    return { success: true };
  } catch (error) {
    console.error("Failed to claim idea:", error);
    return { success: false, error: "Failed to claim idea" };
  }
}

// Claim idea to a specific agent
export async function claimIdeaToAgentAction(ideaUuid: string, agentUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const idea = await getIdeaByUuid(auth.companyUuid, ideaUuid);
    if (!idea) {
      return { success: false, error: "Idea not found" };
    }

    if (idea.status !== "open") {
      return { success: false, error: "Idea is not available for claiming" };
    }

    await claimIdea({
      ideaUuid,
      companyUuid: auth.companyUuid,
      assigneeType: "agent",
      assigneeUuid: agentUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${idea.projectUuid}/ideas/${ideaUuid}`);
    revalidatePath(`/projects/${idea.projectUuid}/ideas`);

    return { success: true };
  } catch (error) {
    console.error("Failed to claim idea to agent:", error);
    return { success: false, error: "Failed to claim idea" };
  }
}

// Claim idea to a specific user (all their PM agents can see it)
export async function claimIdeaToUserAction(ideaUuid: string, userUuid: string) {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const idea = await getIdeaByUuid(auth.companyUuid, ideaUuid);
    if (!idea) {
      return { success: false, error: "Idea not found" };
    }

    if (idea.status !== "open") {
      return { success: false, error: "Idea is not available for claiming" };
    }

    await claimIdea({
      ideaUuid,
      companyUuid: auth.companyUuid,
      assigneeType: "user",
      assigneeUuid: userUuid,
      assignedByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${idea.projectUuid}/ideas/${ideaUuid}`);
    revalidatePath(`/projects/${idea.projectUuid}/ideas`);

    return { success: true };
  } catch (error) {
    console.error("Failed to claim idea to user:", error);
    return { success: false, error: "Failed to claim idea" };
  }
}

// Get PM agents for assignment (Ideas can only be assigned to PM agents)
export async function getPmAgentsAction() {
  const auth = await getServerAuthContext();
  if (!auth || auth.type !== "user") {
    return { agents: [], users: [] };
  }

  try {
    const [agents, users] = await Promise.all([
      getAgentsByRole(auth.companyUuid, "pm"),
      getCompanyUsers(auth.companyUuid),
    ]);
    return { agents, users };
  } catch (error) {
    console.error("Failed to get PM agents:", error);
    return { agents: [], users: [] };
  }
}
