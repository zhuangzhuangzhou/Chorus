// src/app/(dashboard)/projects/[uuid]/tasks/page.tsx
// Server Component - UUID 从 URL 获取

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth-server";
import { listTasks } from "@/services/task.service";
import { projectExists } from "@/services/project.service";
import { KanbanBoard } from "./kanban-board";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export default async function TasksPage({ params }: PageProps) {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const { uuid: projectUuid } = await params;
  const t = await getTranslations();

  // 验证项目存在
  const exists = await projectExists(auth.companyUuid, projectUuid);
  if (!exists) {
    redirect("/projects");
  }

  // 获取所有 Tasks
  const { tasks } = await listTasks({
    companyUuid: auth.companyUuid,
    projectUuid,
    skip: 0,
    take: 1000,
  });

  const totalHours = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">{t("tasks.title")}</h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-sm text-[#6B6B6B]">
              {t("tasks.subtitle")}
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
                  <span className="text-[#2C2C2C]">{totalHours.toFixed(1)}</span> {t("tasks.agentHours")}
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
          {t("tasks.newTask")}
        </Button>
      </div>

      {/* Kanban Board with drag-and-drop */}
      <KanbanBoard projectUuid={projectUuid} initialTasks={tasks} />
    </div>
  );
}
