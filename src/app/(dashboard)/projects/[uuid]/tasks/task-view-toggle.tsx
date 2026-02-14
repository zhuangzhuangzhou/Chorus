"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "./kanban-board";
import { DagView } from "./dag-view";
import { TaskDetailPanel } from "./task-detail-panel";

interface Task {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  proposalUuid: string | null;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
}

interface TaskViewToggleProps {
  projectUuid: string;
  initialTasks: Task[];
  currentUserUuid: string;
  initialSelectedTaskUuid?: string | null;
}

export function TaskViewToggle({ projectUuid, initialTasks, currentUserUuid, initialSelectedTaskUuid }: TaskViewToggleProps) {
  const t = useTranslations();
  const [view, setView] = useState<"kanban" | "dag">("kanban");
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [dagRefreshKey, setDagRefreshKey] = useState(0);

  const selectedTask = useMemo(
    () => (selectedTaskUuid ? initialTasks.find(t => t.uuid === selectedTaskUuid) ?? null : null),
    [selectedTaskUuid, initialTasks]
  );

  const handleDependencyChange = useCallback(() => {
    setDagRefreshKey(prev => prev + 1);
  }, []);

  return (
    <>
      {/* Toolbar: View Toggle + New Task */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-[#F5F2EC] p-1 w-fit">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 rounded-md px-3 text-xs ${
              view === "kanban"
                ? "bg-white text-[#2C2C2C] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#2C2C2C]"
            }`}
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t("tasks.kanbanView")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 rounded-md px-3 text-xs ${
              view === "dag"
                ? "bg-white text-[#2C2C2C] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#2C2C2C]"
            }`}
            onClick={() => setView("dag")}
          >
            <GitBranch className="h-3.5 w-3.5" />
            {t("tasks.dagView")}
          </Button>
        </div>
        <Button
          className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
          onClick={() => {
            setSelectedTaskUuid(null);
            setShowCreatePanel(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("tasks.newTask")}
        </Button>
      </div>

      {/* View Content */}
      {view === "kanban" ? (
        <KanbanBoard
          projectUuid={projectUuid}
          initialTasks={initialTasks}
          currentUserUuid={currentUserUuid}
          initialSelectedTaskUuid={initialSelectedTaskUuid}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <DagView
            projectUuid={projectUuid}
            onTaskSelect={(taskUuid) => setSelectedTaskUuid(taskUuid)}
            refreshKey={dagRefreshKey}
          />
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              projectUuid={projectUuid}
              currentUserUuid={currentUserUuid}
              onClose={() => setSelectedTaskUuid(null)}
              onDependencyChange={handleDependencyChange}
            />
          )}
        </div>
      )}

      {/* Create Task Panel */}
      {showCreatePanel && !selectedTask && (
        <TaskDetailPanel
          task={null}
          projectUuid={projectUuid}
          currentUserUuid={currentUserUuid}
          onClose={() => setShowCreatePanel(false)}
          onCreated={() => setShowCreatePanel(false)}
        />
      )}
    </>
  );
}
