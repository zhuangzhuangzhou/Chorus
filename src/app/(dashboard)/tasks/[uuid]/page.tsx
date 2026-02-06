"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  assigneeUuid?: string;
  createdAt: string;
  updatedAt: string;
  parent?: {
    uuid: string;
    title: string;
  };
  subtasks?: Task[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  assigned: { label: "Assigned", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  to_verify: { label: "To Verify", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  done: { label: "Done", color: "bg-[#E0F2F1] text-[#00796B]" },
  closed: { label: "Closed", color: "bg-[#F5F5F5] text-[#9A9A9A]" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-[#9A9A9A]" },
  medium: { label: "Medium", color: "text-[#E65100]" },
  high: { label: "High", color: "text-[#D32F2F]" },
  critical: { label: "Critical", color: "text-[#B71C1C]" },
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params.uuid as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (uuid) {
      fetchTask();
    }
  }, [uuid]);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchTask = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/tasks/${uuid}`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !task) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/tasks/${uuid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleClaim = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !task) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/tasks/${uuid}/claim`, {
        method: "POST",
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchTask();
      }
    } catch (error) {
      console.error("Failed to claim task:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[#6B6B6B]">Task not found</div>
        <Link href="/tasks" className="mt-4 text-[#C67A52] hover:underline">
          Back to Tasks
        </Link>
      </div>
    );
  }

  const statusOrder = ["open", "assigned", "in_progress", "to_verify", "done"];
  const currentIndex = statusOrder.indexOf(task.status);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/tasks" className="text-[#6B6B6B] hover:text-[#2C2C2C]">
          Tasks
        </Link>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-[#9A9A9A]"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[#2C2C2C]">{task.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Badge className={statusConfig[task.status]?.color || ""}>
              {statusConfig[task.status]?.label || task.status}
            </Badge>
            <span className={`text-sm font-medium ${priorityConfig[task.priority]?.color || ""}`}>
              {priorityConfig[task.priority]?.label || task.priority} Priority
            </span>
            {task.storyPoints && (
              <span className="rounded bg-[#F5F2EC] px-2 py-0.5 text-sm font-medium text-[#6B6B6B]">
                {task.storyPoints}h
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">{task.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[#6B6B6B]">
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {task.status === "open" && (
            <Button
              onClick={handleClaim}
              disabled={updatingStatus}
              className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
            >
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
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Claim Task
            </Button>
          )}
          <Button
            variant="outline"
            className="border-[#E5E0D8] text-[#6B6B6B]"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card className="border-[#E5E0D8] p-6">
            <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Description</h2>
            {task.description ? (
              <div className="prose prose-sm max-w-none text-[#6B6B6B]">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            ) : (
              <p className="text-sm text-[#9A9A9A] italic">No description provided</p>
            )}
          </Card>

          {/* Status Progress */}
          {task.status !== "closed" && (
            <Card className="border-[#E5E0D8] p-6">
              <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Status Progress</h2>
              <div className="flex items-center justify-between">
                {statusOrder.map((status, index) => {
                  const isActive = index === currentIndex;
                  const isComplete = index < currentIndex;
                  const config = statusConfig[status];

                  return (
                    <div key={status} className="flex flex-1 items-center">
                      <button
                        onClick={() => handleStatusChange(status)}
                        disabled={updatingStatus}
                        className={`flex flex-col items-center ${
                          isActive || isComplete ? "cursor-pointer" : "cursor-pointer opacity-50"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isActive
                              ? "bg-[#C67A52] text-white"
                              : isComplete
                              ? "bg-[#5A9E6F] text-white"
                              : "border-2 border-[#E5E0D8] text-[#9A9A9A]"
                          }`}
                        >
                          {isComplete ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="text-xs font-medium">{index + 1}</span>
                          )}
                        </div>
                        <span className="mt-2 text-xs font-medium text-[#6B6B6B]">
                          {config?.label}
                        </span>
                      </button>
                      {index < statusOrder.length - 1 && (
                        <div
                          className={`mx-2 h-0.5 flex-1 ${
                            index < currentIndex ? "bg-[#5A9E6F]" : "bg-[#E5E0D8]"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Card className="border-[#E5E0D8] p-6">
              <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Subtasks</h2>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <Link
                    key={subtask.uuid}
                    href={`/tasks/${subtask.uuid}`}
                    className="flex items-center justify-between rounded-lg border border-[#E5E0D8] p-3 hover:border-[#C67A52]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          subtask.status === "done"
                            ? "bg-[#5A9E6F]"
                            : subtask.status === "in_progress"
                            ? "bg-[#E65100]"
                            : "bg-[#E5E0D8]"
                        }`}
                      />
                      <span className="text-sm text-[#2C2C2C]">{subtask.title}</span>
                    </div>
                    <Badge className={statusConfig[subtask.status]?.color || ""}>
                      {statusConfig[subtask.status]?.label || subtask.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Assignment</h3>
            {task.assigneeName ? (
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    task.assigneeType === "agent" ? "bg-[#E3F2FD]" : "bg-[#F5F2EC]"
                  }`}
                >
                  {task.assigneeType === "agent" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-[#1976D2]"
                    >
                      <path d="M12 8V4H8" />
                      <rect width="16" height="12" x="4" y="8" rx="2" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-[#6B6B6B]"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#2C2C2C]">
                    {task.assigneeName}
                  </div>
                  <div className="text-xs text-[#9A9A9A]">
                    {task.assigneeType === "agent" ? "Agent" : "User"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#9A9A9A]">Unassigned</div>
            )}
          </Card>

          {/* Parent Task */}
          {task.parent && (
            <Card className="border-[#E5E0D8] p-4">
              <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Parent Task</h3>
              <Link
                href={`/tasks/${task.parent.uuid}`}
                className="flex items-center gap-2 text-sm text-[#C67A52] hover:underline"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                {task.parent.title}
              </Link>
            </Card>
          )}

          {/* Details */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Status</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {statusConfig[task.status]?.label || task.status}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Priority</dt>
                <dd className={`font-medium ${priorityConfig[task.priority]?.color || ""}`}>
                  {priorityConfig[task.priority]?.label || task.priority}
                </dd>
              </div>
              {task.storyPoints && (
                <div className="flex justify-between text-sm">
                  <dt className="text-[#9A9A9A]">Story Points</dt>
                  <dd className="font-medium text-[#2C2C2C]">{task.storyPoints}h</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Created</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(task.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Updated</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(task.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
