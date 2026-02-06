"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/lib/auth-server";
import { createIdea } from "@/services/idea.service";

interface Attachment {
  type: string;
  name: string;
  url: string;
  content?: string; // For text-based files like .md
}

interface CreateIdeaInput {
  projectUuid: string;
  title: string;
  content?: string;
  attachments?: Attachment[];
}

export async function createIdeaAction(input: CreateIdeaInput) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const idea = await createIdea({
      companyUuid: auth.companyUuid,
      projectUuid: input.projectUuid,
      title: input.title,
      content: input.content || null,
      attachments: input.attachments || null,
      createdByUuid: auth.actorUuid,
    });

    revalidatePath(`/projects/${input.projectUuid}/ideas`);
    return { success: true, ideaUuid: idea.uuid };
  } catch (error) {
    console.error("Failed to create idea:", error);
    return { success: false, error: "Failed to create idea" };
  }
}
