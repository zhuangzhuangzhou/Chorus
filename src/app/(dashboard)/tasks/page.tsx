"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  assigneeType: string | null;
  assigneeName?: string;
  createdAt: string;
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchTasks = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/tasks`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForColumn = (statuses: string[]) => {
    return tasks.filter((task) => statuses.includes(task.status));
  };

  // Calculate total Agent Hours for column
  const getColumnHours = (statuses: string[]) => {
    return getTasksForColumn(statuses).reduce(
      (sum, task) => sum + (task.storyPoints || 0),
      0
    );
  };

  // Calculate total hours across all tasks
  const totalHours = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">Tasks</h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-sm text-[#6B6B6B]">
              Kanban board for task management
            </p>
            {totalHours > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#F5F2EC] px-3 py-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-[#C67A52]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs font-medium text-[#6B6B6B]">
                  <span className="text-[#2C2C2C]">{totalHours.toFixed(1)}</span> Agent Hours total
                </span>
              </div>
            )}
          </div>
        </div>
        <Button className="bg-[#C67A52] hover:bg-[#B56A42] text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
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

              {/* Tasks */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E0D8] text-sm text-[#9A9A9A]">
                    No tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <Link key={task.uuid} href={`/tasks/${task.uuid}`}>
                      <Card className="cursor-pointer border-[#E5E0D8] bg-white p-4 transition-all hover:border-[#C67A52] hover:shadow-sm">
                      <div className="mb-2 flex items-start justify-between">
                        <Badge className={statusConfig[task.status]?.color || ""}>
                          {statusConfig[task.status]?.label || task.status}
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
                        {task.assigneeName ? (
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
                              <rect width="16" height="12" x="4" y="8" rx="2" />
                            </svg>
                            {task.assigneeName}
                          </span>
                        ) : task.status === "open" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-[#C67A52] hover:bg-[#FFF3E0]"
                            onClick={(e) => {
                              e.preventDefault();
                              // TODO: Claim task
                            }}
                          >
                            Claim
                          </Button>
                        ) : (
                          <span>Unassigned</span>
                        )}
                      </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
