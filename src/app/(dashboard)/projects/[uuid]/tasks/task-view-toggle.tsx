"use client";

import { useState, useMemo } from "react";
import { LayoutGrid, GitBranch } from "lucide-react";
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
}

export function TaskViewToggle({ projectUuid, initialTasks, currentUserUuid }: TaskViewToggleProps) {
  const [view, setView] = useState<"kanban" | "dag">("kanban");
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => (selectedTaskUuid ? initialTasks.find(t => t.uuid === selectedTaskUuid) ?? null : null),
    [selectedTaskUuid, initialTasks]
  );

  return (
    <>
      {/* View Toggle */}
      <div className="mb-4 flex items-center gap-1 rounded-lg bg-[#F5F2EC] p-1 w-fit">
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
          Kanban
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
          DAG
        </Button>
      </div>

      {/* View Content */}
      {view === "kanban" ? (
        <KanbanBoard
          projectUuid={projectUuid}
          initialTasks={initialTasks}
          currentUserUuid={currentUserUuid}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <DagView
            projectUuid={projectUuid}
            onTaskSelect={(taskUuid) => setSelectedTaskUuid(taskUuid)}
          />
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              projectUuid={projectUuid}
              currentUserUuid={currentUserUuid}
              onClose={() => setSelectedTaskUuid(null)}
            />
          )}
        </div>
      )}
    </>
  );
}
