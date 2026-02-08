"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, Pencil, CheckCircle, Play, Eye, Bot, User, Send, FileText, Loader2, Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateTaskStatusAction, createTaskAction, updateTaskFieldsAction, deleteTaskAction } from "./[taskUuid]/actions";
import {
  getTaskCommentsAction,
  createTaskCommentAction,
} from "./[taskUuid]/comment-actions";
import { getTaskActivitiesAction } from "./[taskUuid]/activity-actions";
import type { ActivityResponse } from "@/services/activity.service";
import {
  getTaskSourceAction,
  type ProposalSource,
} from "./[taskUuid]/source-actions";
import type { CommentResponse } from "@/services/comment.service";
import { AssignTaskModal } from "./assign-task-modal";

interface Task {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  acceptanceCriteria?: string | null;
  proposalUuid: string | null;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
}

interface TaskDetailPanelProps {
  task: Task | null;
  projectUuid: string;
  currentUserUuid: string;
  onClose: () => void;
  onCreated?: () => void;
}

// 状态颜色配置
const statusColors: Record<string, string> = {
  open: "bg-[#FFF3E0] text-[#E65100]",
  assigned: "bg-[#E3F2FD] text-[#1976D2]",
  in_progress: "bg-[#E8F5E9] text-[#5A9E6F]",
  to_verify: "bg-[#F3E5F5] text-[#7B1FA2]",
  done: "bg-[#E0F2F1] text-[#00796B]",
  closed: "bg-[#F5F5F5] text-[#9A9A9A]",
};

// 状态到翻译 key 的映射
const statusI18nKeys: Record<string, string> = {
  open: "open",
  assigned: "assigned",
  in_progress: "inProgress",
  to_verify: "toVerify",
  done: "done",
  closed: "closed",
};

// 优先级颜色配置
const priorityColors: Record<string, string> = {
  low: "bg-[#F5F5F5] text-[#9A9A9A]",
  medium: "bg-[#FFF3E0] text-[#E65100]",
  high: "bg-[#FEE2E2] text-[#D32F2F]",
  critical: "bg-[#FFCDD2] text-[#B71C1C]",
};

// 优先级到翻译 key 的映射
const priorityI18nKeys: Record<string, string> = {
  low: "lowPriority",
  medium: "mediumPriority",
  high: "highPriority",
  critical: "criticalPriority",
};

// 格式化相对时间
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

// Activity 圆点颜色
function getActivityDotColor(action: string): string {
  switch (action) {
    case "task_created":
      return "bg-[#C67A52]";
    case "task_assigned":
    case "task_claimed":
      return "bg-[#1976D2]";
    case "task_started":
      return "bg-[#5A9E6F]";
    case "task_submitted":
      return "bg-[#7B1FA2]";
    case "task_completed":
    case "task_verified":
      return "bg-[#00796B]";
    case "task_released":
      return "bg-[#E65100]";
    default:
      return "bg-[#6B6B6B]";
  }
}

// 格式化 Activity 消息
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatActivityMessage(activity: ActivityResponse, t: any): string {
  const { action, actorName } = activity;

  switch (action) {
    case "task_created":
      return t("activity.taskCreated", { actor: actorName });
    case "task_assigned":
      return t("activity.taskAssigned", { actor: actorName });
    case "task_claimed":
      return t("activity.taskClaimed", { actor: actorName });
    case "task_started":
      return t("activity.taskStarted", { actor: actorName });
    case "task_submitted":
      return t("activity.taskSubmitted", { actor: actorName });
    case "task_completed":
    case "task_verified":
      return t("activity.taskCompleted", { actor: actorName });
    case "task_released":
      return t("activity.taskReleased", { actor: actorName });
    case "task_status_changed":
      return t("activity.taskStatusChanged", { actor: actorName });
    default:
      return `${actorName}: ${action}`;
  }
}

export function TaskDetailPanel({
  task,
  projectUuid,
  currentUserUuid,
  onClose,
  onCreated,
}: TaskDetailPanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [source, setSource] = useState<ProposalSource | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Edit / Create mode state
  const isCreateMode = task === null;
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [editTitle, setEditTitle] = useState(task?.title || "");
  const [editDescription, setEditDescription] = useState(task?.description || "");
  const [editPriority, setEditPriority] = useState(task?.priority || "medium");
  const [editStoryPoints, setEditStoryPoints] = useState<string>(
    task?.storyPoints != null ? String(task.storyPoints) : ""
  );
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState(
    task?.acceptanceCriteria || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAssignedToMe = task?.assignee?.uuid === currentUserUuid;
  const canStart = isAssignedToMe && task?.status === "assigned";
  const canMarkToVerify = isAssignedToMe && task?.status === "in_progress";
  const canMarkDone = task?.status === "to_verify";

  // 加载评论、活动和来源
  useEffect(() => {
    if (!task) return;

    async function loadComments() {
      setIsLoadingComments(true);
      const result = await getTaskCommentsAction(task!.uuid);
      setComments(result.comments);
      setIsLoadingComments(false);
    }
    async function loadActivities() {
      setIsLoadingActivities(true);
      const result = await getTaskActivitiesAction(task!.uuid);
      setActivities(result.activities);
      setIsLoadingActivities(false);
    }
    async function loadSource() {
      if (task!.proposalUuid) {
        const result = await getTaskSourceAction(task!.proposalUuid);
        setSource(result);
      }
    }
    loadComments();
    loadActivities();
    loadSource();
  }, [task?.uuid, task?.proposalUuid]);

  // Reset edit state when task changes
  useEffect(() => {
    if (task) {
      setIsEditing(false);
      setEditTitle(task.title);
      setEditDescription(task.description || "");
      setEditPriority(task.priority);
      setEditStoryPoints(task.storyPoints != null ? String(task.storyPoints) : "");
      setEditAcceptanceCriteria(task.acceptanceCriteria || "");
      setEditError(null);
    }
  }, [task?.uuid, task?.title, task?.description, task?.priority, task?.storyPoints, task?.acceptanceCriteria]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    setIsLoading(true);
    const result = await updateTaskStatusAction(task.uuid, newStatus);
    setIsLoading(false);
    if (result.success) {
      onClose();
      router.refresh();
    }
  };

  const handleSubmitComment = async () => {
    if (!task || !comment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const result = await createTaskCommentAction(task.uuid, comment);
    setIsSubmittingComment(false);

    if (result.success && result.comment) {
      setComments((prev) => [...prev, result.comment!]);
      setComment("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleStartEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStoryPoints(task.storyPoints != null ? String(task.storyPoints) : "");
    setEditAcceptanceCriteria(task.acceptanceCriteria || "");
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isCreateMode) {
      onClose();
      return;
    }
    setIsEditing(false);
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description || "");
      setEditPriority(task.priority);
      setEditStoryPoints(task.storyPoints != null ? String(task.storyPoints) : "");
      setEditAcceptanceCriteria(task.acceptanceCriteria || "");
    }
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError(t("tasks.titleRequired"));
      return;
    }

    setIsSaving(true);
    setEditError(null);

    const storyPointsValue = editStoryPoints.trim() ? parseFloat(editStoryPoints) : null;

    if (isCreateMode) {
      const result = await createTaskAction({
        projectUuid,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        storyPoints: storyPointsValue,
        acceptanceCriteria: editAcceptanceCriteria.trim() || null,
      });

      setIsSaving(false);

      if (result.success) {
        onCreated?.();
        onClose();
        router.refresh();
      } else {
        setEditError(result.error || t("tasks.createFailed"));
      }
    } else {
      const result = await updateTaskFieldsAction({
        taskUuid: task!.uuid,
        projectUuid,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
        storyPoints: storyPointsValue,
        acceptanceCriteria: editAcceptanceCriteria.trim() || null,
      });

      setIsSaving(false);

      if (result.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        setEditError(result.error || t("tasks.updateFailed"));
      }
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    const result = await deleteTaskAction(task.uuid, projectUuid);
    setIsDeleting(false);

    if (result.success) {
      onClose();
      router.refresh();
    }
  };

  // Render the edit/create form
  const renderEditForm = () => (
    <div className="space-y-5">
      {editError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {editError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="edit-title" className="text-[13px] font-medium text-[#2C2C2C]">
          {t("tasks.titleLabel")}
        </Label>
        <Input
          id="edit-title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="border-[#E5E0D8] text-sm focus-visible:ring-[#C67A52]"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description" className="text-[13px] font-medium text-[#2C2C2C]">
          {t("tasks.descriptionLabel")}
        </Label>
        <Textarea
          id="edit-description"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={4}
          className="border-[#E5E0D8] text-sm resize-none focus-visible:ring-[#C67A52]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-priority" className="text-[13px] font-medium text-[#2C2C2C]">
          {t("tasks.priorityLabel")}
        </Label>
        <Select value={editPriority} onValueChange={setEditPriority}>
          <SelectTrigger className="border-[#E5E0D8] text-sm focus:ring-[#C67A52]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">{t("priority.low")}</SelectItem>
            <SelectItem value="medium">{t("priority.medium")}</SelectItem>
            <SelectItem value="high">{t("priority.high")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-story-points" className="text-[13px] font-medium text-[#2C2C2C]">
          {t("tasks.storyPointsLabel")}
        </Label>
        <Input
          id="edit-story-points"
          type="number"
          min="0"
          step="0.5"
          value={editStoryPoints}
          onChange={(e) => setEditStoryPoints(e.target.value)}
          className="border-[#E5E0D8] text-sm focus-visible:ring-[#C67A52]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-acceptance-criteria" className="text-[13px] font-medium text-[#2C2C2C]">
          {t("tasks.acceptanceCriteriaLabel")}
        </Label>
        <Textarea
          id="edit-acceptance-criteria"
          value={editAcceptanceCriteria}
          onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
          rows={4}
          className="border-[#E5E0D8] text-sm resize-none focus-visible:ring-[#C67A52]"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-xl border-l border-[#E5E0D8] animate-in slide-in-from-right duration-300">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-[#F5F2EC] px-6 py-5">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <h2 className="text-base font-semibold text-[#2C2C2C]">
                {isCreateMode ? t("tasks.createTaskTitle") : t("tasks.editTask")}
              </h2>
            ) : task ? (
              <>
                <h2 className="text-base font-semibold text-[#2C2C2C] truncate">
                  {task.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge className={statusColors[task.status] || ""}>
                    {t(`status.${statusI18nKeys[task.status] || task.status}`)}
                  </Badge>
                  <Badge className={priorityColors[task.priority] || ""}>
                    {t(`priority.${priorityI18nKeys[task.priority] || task.priority}`)}
                  </Badge>
                  {task.storyPoints && (
                    <span className="rounded bg-[#F5F2EC] px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
                      {task.storyPoints}h
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {task && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-[#E5E0D8] text-[#2C2C2C]"
                onClick={handleStartEdit}
              >
                <Pencil className="h-3.5 w-3.5 text-[#6B6B6B]" />
                <span className="text-xs">{t("common.edit")}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#E5E0D8]"
              onClick={isEditing && !isCreateMode ? handleCancelEdit : onClose}
            >
              <X className="h-4 w-4 text-[#6B6B6B]" />
            </Button>
          </div>
        </div>

        {/* Panel Body - Scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex min-h-full flex-col px-6 py-5">
            {isEditing ? (
              renderEditForm()
            ) : task ? (
              <>
                {/* Assignee Section */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("common.assignee")}
                  </label>
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-[#FAF8F4] p-3">
                    {task.assignee ? (
                      <>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={task.assignee.type === "agent" ? "bg-[#C67A52] text-white" : "bg-[#E5E0D8] text-[#6B6B6B]"}>
                            {task.assignee.type === "agent" ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : (
                              task.assignee.name.charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-[#2C2C2C]">
                            {task.assignee.name}
                          </div>
                          <div className="text-xs text-[#6B6B6B]">
                            {task.assignee.type === "agent"
                              ? `${t("common.agent")} • ${task.assignee.assignedAt ? new Date(task.assignee.assignedAt).toLocaleDateString() : ''}`
                              : t("common.user")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-[#9A9A9A]">{t("common.unassigned")}</span>
                    )}
                  </div>
                </div>

                {/* Description Section */}
                <div className="mt-5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("common.description")}
                  </label>
                  <div className="mt-2">
                    {task.description ? (
                      <p className="text-[13px] leading-relaxed text-[#2C2C2C] whitespace-pre-wrap">
                        {task.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-[#9A9A9A]">{t("common.noDescription")}</p>
                    )}
                  </div>
                </div>

                {/* Acceptance Criteria Section */}
                {task.acceptanceCriteria && (
                  <div className="mt-5">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                      {t("tasks.acceptanceCriteria")}
                    </label>
                    <div className="mt-2">
                      <p className="text-[13px] leading-relaxed text-[#2C2C2C] whitespace-pre-wrap">
                        {task.acceptanceCriteria}
                      </p>
                    </div>
                  </div>
                )}

                {/* Source Section - only show if from proposal */}
                {source && (
                  <div className="mt-5">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                      {t("common.source")}
                    </label>
                    <a
                      href={`/projects/${projectUuid}/proposals/${source.uuid}`}
                      className="mt-2 flex items-center justify-between rounded-lg bg-[#FAF8F4] p-3 hover:bg-[#F0EDE5] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-[#C67A52]" />
                        <span className="text-xs text-[#2C2C2C]">{source.title}</span>
                      </div>
                    </a>
                  </div>
                )}

                {/* Activity Section - fills remaining space */}
                <div className="mt-5 flex-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("common.activity")}
                  </label>
                  <div className="mt-2 space-y-3">
                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-[#9A9A9A]" />
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-sm text-[#9A9A9A] italic">{t("common.noActivity")}</p>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.uuid} className="flex items-start gap-2.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5F2EC]">
                            <div className={`h-2 w-2 rounded-full ${getActivityDotColor(activity.action)}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-[#2C2C2C]">
                              {formatActivityMessage(activity, t)}
                            </p>
                            <p className="text-[10px] text-[#9A9A9A]">{formatRelativeTime(activity.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Comments Section - at bottom */}
                <div className="mt-5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("comments.title")}
                  </label>
                  <div className="mt-3 space-y-3">
                    {isLoadingComments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-[#9A9A9A]" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-[#9A9A9A] italic">{t("comments.noComments")}</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.uuid} className="flex gap-2.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className={c.author.type === "agent" ? "bg-[#C67A52] text-white" : "bg-[#E5E0D8] text-[#6B6B6B] text-[10px]"}>
                              {c.author.type === "agent" ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                c.author.name.charAt(0).toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#2C2C2C]">{c.author.name}</span>
                              <span className="text-[10px] text-[#9A9A9A]">{formatRelativeTime(c.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-[#2C2C2C]">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <Separator className="my-3 bg-[#F5F2EC]" />
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-[#C67A52] text-white text-[10px]">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="relative flex-1">
                      <Input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("comments.addComment")}
                        className="h-9 rounded-lg border-none bg-[#FAF8F4] pr-10 text-sm placeholder:text-[#9A9A9A]"
                        disabled={isSubmittingComment}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        disabled={!comment.trim() || isSubmittingComment}
                        onClick={handleSubmitComment}
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9A9A9A]" />
                        ) : (
                          <Send className="h-3.5 w-3.5 text-[#C67A52]" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        {/* Panel Footer */}
        <div className="border-t border-[#F5F2EC] px-6 py-4">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  className="border-[#E5E0D8]"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editTitle.trim()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.saving")}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {isCreateMode ? t("common.create") : t("tasks.saveChanges")}
                    </>
                  )}
                </Button>
              </>
            ) : task ? (
              <>
                {/* Assign button - always available except for done/closed */}
                {task.status !== "done" && task.status !== "closed" && (
                  <Button
                    variant="outline"
                    className="border-[#E5E0D8]"
                    onClick={() => setShowAssignModal(true)}
                    disabled={isLoading}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t("common.assign")}
                  </Button>
                )}
                {canStart && (
                  <Button
                    className="flex-1 bg-[#1976D2] hover:bg-[#1565C0] text-white"
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={isLoading}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {t("tasks.startWork")}
                  </Button>
                )}
                {canMarkToVerify && (
                  <Button
                    className="flex-1 bg-[#7B1FA2] hover:bg-[#6A1B9A] text-white"
                    onClick={() => handleStatusChange("to_verify")}
                    disabled={isLoading}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t("tasks.submitForReview")}
                  </Button>
                )}
                {canMarkDone && (
                  <Button
                    className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white"
                    onClick={() => handleStatusChange("done")}
                    disabled={isLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t("tasks.markAsVerified")}
                  </Button>
                )}
                {(task.status === "done" || task.status === "closed") && (
                  <div className="text-sm text-[#9A9A9A] text-center w-full">
                    {t("tasks.taskCompleted")}
                  </div>
                )}
                <div className="ml-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-[#E5E0D8] text-[#D32F2F] hover:bg-[#FFEBEE] hover:text-[#D32F2F] hover:border-[#D32F2F]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("tasks.deleteTask")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("tasks.deleteTaskConfirm", { title: task.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("common.delete")}
                            </>
                          ) : (
                            t("common.delete")
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Assign Task Modal */}
      {task && showAssignModal && (
        <AssignTaskModal
          task={task}
          projectUuid={projectUuid}
          currentUserUuid={currentUserUuid}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );
}
