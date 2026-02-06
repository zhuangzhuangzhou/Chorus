// src/app/(dashboard)/projects/[uuid]/tasks/[taskUuid]/page.tsx
// Server Component - UUID 从 URL 获取

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerAuthContext } from "@/lib/auth-server";
import { getTask } from "@/services/task.service";
import { projectExists } from "@/services/project.service";
import { TaskActions } from "./task-actions";
import { TaskStatusProgress } from "./task-status-progress";

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

interface PageProps {
  params: Promise<{ uuid: string; taskUuid: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const { uuid: projectUuid, taskUuid } = await params;
  const t = await getTranslations();

  // 验证项目存在
  const exists = await projectExists(auth.companyUuid, projectUuid);
  if (!exists) {
    redirect("/projects");
  }

  // 获取 Task 详情
  const task = await getTask(auth.companyUuid, taskUuid);
  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[#6B6B6B]">{t("tasks.taskNotFound")}</div>
        <Link href={`/projects/${projectUuid}/tasks`} className="mt-4 text-[#C67A52] hover:underline">
          {t("tasks.backToTasks")}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href={`/projects/${projectUuid}/tasks`} className="text-[#6B6B6B] hover:text-[#2C2C2C]">
          {t("nav.tasks")}
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
              {priorityConfig[task.priority]?.label || task.priority} {t("common.priority")}
            </span>
            {task.storyPoints && (
              <span className="rounded bg-[#F5F2EC] px-2 py-0.5 text-sm font-medium text-[#6B6B6B]">
                {task.storyPoints}h
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">{task.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[#6B6B6B]">
            <span>{t("common.created")} {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <TaskActions
          taskUuid={taskUuid}
          projectUuid={projectUuid}
          status={task.status}
          currentUserUuid={auth.actorUuid}
        />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card className="border-[#E5E0D8] p-6">
            <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">{t("common.description")}</h2>
            {task.description ? (
              <div className="prose prose-sm max-w-none text-[#6B6B6B]">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            ) : (
              <p className="text-sm text-[#9A9A9A] italic">{t("common.noDescription")}</p>
            )}
          </Card>

          {/* Status Progress */}
          {task.status !== "closed" && (
            <TaskStatusProgress
              taskUuid={taskUuid}
              currentStatus={task.status}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">{t("common.assignment")}</h3>
            {task.assignee ? (
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    task.assignee.type === "agent" ? "bg-[#E3F2FD]" : "bg-[#F5F2EC]"
                  }`}
                >
                  {task.assignee.type === "agent" ? (
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
                    {task.assignee.name}
                  </div>
                  <div className="text-xs text-[#9A9A9A]">
                    {task.assignee.type === "agent" ? t("common.agent") : t("common.user")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#9A9A9A]">{t("common.unassigned")}</div>
            )}
          </Card>

          {/* Details */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">{t("common.details")}</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">{t("common.status")}</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {statusConfig[task.status]?.label || task.status}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">{t("common.priority")}</dt>
                <dd className={`font-medium ${priorityConfig[task.priority]?.color || ""}`}>
                  {priorityConfig[task.priority]?.label || task.priority}
                </dd>
              </div>
              {task.storyPoints && (
                <div className="flex justify-between text-sm">
                  <dt className="text-[#9A9A9A]">{t("tasks.storyPoints")}</dt>
                  <dd className="font-medium text-[#2C2C2C]">{task.storyPoints}h</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">{t("common.created")}</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(task.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">{t("common.updated")}</dt>
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
