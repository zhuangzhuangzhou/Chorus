"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { moveTaskToColumnAction } from "./actions";

interface Task {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
}

interface KanbanBoardProps {
  projectUuid: string;
  initialTasks: Task[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  assigned: { label: "Assigned", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  to_verify: { label: "To Verify", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  done: { label: "Done", color: "bg-[#E0F2F1] text-[#00796B]" },
  closed: { label: "Closed", color: "bg-[#F5F5F5] text-[#9A9A9A]" },
};

const columns = [
  { id: "todo", label: "To Do", statuses: ["open", "assigned"] },
  { id: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { id: "to_verify", label: "To Verify", statuses: ["to_verify"] },
  { id: "done", label: "Done", statuses: ["done", "closed"] },
];

export function KanbanBoard({ projectUuid, initialTasks }: KanbanBoardProps) {
  const t = useTranslations();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const getTasksForColumn = (statuses: string[]) => {
    return tasks.filter((task) => statuses.includes(task.status));
  };

  const getColumnHours = (statuses: string[]) => {
    return getTasksForColumn(statuses).reduce(
      (sum, task) => sum + (task.storyPoints || 0),
      0
    );
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a column
    if (!destination) return;

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskUuid = draggableId;
    const newColumnId = destination.droppableId;
    const sourceColumnId = source.droppableId;

    // Find the task
    const task = tasks.find((t) => t.uuid === taskUuid);
    if (!task) return;

    // Determine the new status based on destination column
    let newStatus: string;
    const column = columns.find((c) => c.id === newColumnId);
    if (newColumnId === "todo") {
      // Keep the original status if moving within todo, or set to open
      newStatus = task.status === "assigned" ? "assigned" : "open";
    } else if (newColumnId === "in_progress") {
      newStatus = "in_progress";
    } else if (newColumnId === "to_verify") {
      newStatus = "to_verify";
    } else if (newColumnId === "done") {
      // If coming from to_verify, set to done, otherwise set to to_verify
      newStatus = task.status === "to_verify" ? "done" : "to_verify";
    } else {
      return;
    }

    // Optimistically update the UI
    setTasks((prev) =>
      prev.map((t) => (t.uuid === taskUuid ? { ...t, status: newStatus } : t))
    );

    // Call the server action
    const result2 = await moveTaskToColumnAction(taskUuid, newColumnId, projectUuid);

    if (!result2.success) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.uuid === taskUuid ? { ...t, status: task.status } : t
        )
      );
      console.error("Failed to move task:", result2.error);
    } else {
      // Refresh to get the latest data
      router.refresh();
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnTasks = getTasksForColumn(column.statuses);
          return (
            <div
              key={column.id}
              className="flex w-[300px] flex-shrink-0 flex-col rounded-xl bg-[#F5F2EC] p-4"
            >
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#2C2C2C]">{column.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
                    {columnTasks.length}
                  </span>
                </div>
                {getColumnHours(column.statuses) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-[#9A9A9A]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {getColumnHours(column.statuses)}h
                  </span>
                )}
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 overflow-y-auto min-h-[100px] rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-[#E5E0D8]" : ""
                    }`}
                  >
                    {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E0D8] text-sm text-[#9A9A9A]">
                        {t("tasks.noTasks")}
                      </div>
                    ) : (
                      columnTasks.map((task, index) => (
                        <Draggable
                          key={task.uuid}
                          draggableId={task.uuid}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Link
                                href={`/projects/${projectUuid}/tasks/${task.uuid}`}
                                onClick={(e) => {
                                  if (snapshot.isDragging) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                <Card
                                  className={`cursor-pointer border-[#E5E0D8] bg-white p-4 transition-all hover:border-[#C67A52] hover:shadow-sm ${
                                    snapshot.isDragging
                                      ? "shadow-lg rotate-2"
                                      : ""
                                  }`}
                                >
                                  <div className="mb-2 flex items-start justify-between">
                                    <Badge
                                      className={
                                        statusConfig[task.status]?.color || ""
                                      }
                                    >
                                      {statusConfig[task.status]?.label ||
                                        task.status}
                                    </Badge>
                                    {task.storyPoints && (
                                      <span className="flex items-center gap-1 rounded bg-[#FFF3E0] px-2 py-0.5 text-xs font-medium text-[#E65100]">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3"
                                        >
                                          <circle cx="12" cy="12" r="10" />
                                          <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {task.storyPoints}h
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="mb-1 font-medium text-[#2C2C2C]">
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="mb-2 line-clamp-2 text-sm text-[#6B6B6B]">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between text-xs text-[#9A9A9A]">
                                    {task.assignee ? (
                                      <span className="flex items-center gap-1">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3"
                                        >
                                          <path d="M12 8V4H8" />
                                          <rect
                                            width="16"
                                            height="12"
                                            x="4"
                                            y="8"
                                            rx="2"
                                          />
                                        </svg>
                                        {task.assignee.name}
                                      </span>
                                    ) : task.status === "open" ? (
                                      <span className="text-[#C67A52]">
                                        {t("common.claim")}
                                      </span>
                                    ) : (
                                      <span>{t("common.unassigned")}</span>
                                    )}
                                  </div>
                                </Card>
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
