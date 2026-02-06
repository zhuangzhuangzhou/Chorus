"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/lib/auth-server";
import { updateTask, getTaskByUuid } from "@/services/task.service";

// Map column IDs to task statuses
const columnToStatusMap: Record<string, string> = {
  todo: "open",
  in_progress: "in_progress",
  to_verify: "to_verify",
  done: "done",
};

export async function moveTaskToColumnAction(
  taskUuid: string,
  columnId: string,
  projectUuid: string
) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify task exists and belongs to this company
    const task = await getTaskByUuid(auth.companyUuid, taskUuid);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Get the new status from the column
    const newStatus = columnToStatusMap[columnId];
    if (!newStatus) {
      return { success: false, error: "Invalid column" };
    }

    // Don't allow moving to done directly for non-verified tasks
    // Done column should only be reached through verify action
    if (newStatus === "done" && task.status !== "to_verify") {
      // When dragging to done column, set to_verify instead
      await updateTask(taskUuid, { status: "to_verify" });
    } else if (newStatus === "done" && task.status === "to_verify") {
      // If task is in to_verify and dragged to done, verify it
      await updateTask(taskUuid, { status: "done" });
    } else {
      await updateTask(taskUuid, { status: newStatus });
    }

    revalidatePath(`/projects/${projectUuid}/tasks`);
    return { success: true };
  } catch (error) {
    console.error("Failed to move task:", error);
    return { success: false, error: "Failed to move task" };
  }
}
