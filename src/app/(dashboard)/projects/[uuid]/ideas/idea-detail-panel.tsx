"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X, Bot, User, Send, FileText, Loader2, Pencil, Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  getIdeaCommentsAction,
  createIdeaCommentAction,
} from "./[ideaUuid]/comment-actions";
import { getIdeaActivitiesAction } from "./[ideaUuid]/activity-actions";
import { updateIdeaAction, deleteIdeaAction } from "./actions";
import type { ActivityResponse } from "@/services/activity.service";
import type { CommentResponse } from "@/services/comment.service";
import { AssignIdeaModal } from "./assign-idea-modal";

interface Idea {
  uuid: string;
  title: string;
  content: string | null;
  status: string;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
  createdAt: string;
}

interface IdeaDetailPanelProps {
  idea: Idea;
  projectUuid: string;
  currentUserUuid: string;
  isUsedInProposal: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

// 状态颜色配置
const statusColors: Record<string, string> = {
  open: "bg-[#FFF3E0] text-[#E65100]",
  assigned: "bg-[#E3F2FD] text-[#1976D2]",
  in_progress: "bg-[#E8F5E9] text-[#5A9E6F]",
  pending_review: "bg-[#F3E5F5] text-[#7B1FA2]",
  completed: "bg-[#E0F2F1] text-[#00796B]",
  closed: "bg-[#F5F5F5] text-[#9A9A9A]",
};

const statusI18nKeys: Record<string, string> = {
  open: "open",
  assigned: "assigned",
  in_progress: "inProgress",
  pending_review: "pendingReview",
  completed: "completed",
  closed: "closed",
};

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

function getActivityDotColor(action: string): string {
  switch (action) {
    case "idea_created":
      return "bg-[#C67A52]";
    case "idea_assigned":
    case "idea_claimed":
      return "bg-[#1976D2]";
    case "idea_started":
      return "bg-[#5A9E6F]";
    case "idea_completed":
      return "bg-[#00796B]";
    case "idea_released":
      return "bg-[#E65100]";
    default:
      return "bg-[#6B6B6B]";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatActivityMessage(activity: ActivityResponse, t: any): string {
  const { action, actorName } = activity;

  switch (action) {
    case "idea_created":
      return t("activity.ideaCreated", { actor: actorName });
    case "idea_assigned":
      return t("activity.ideaAssigned", { actor: actorName });
    case "idea_claimed":
      return t("activity.ideaClaimed", { actor: actorName });
    case "idea_released":
      return t("activity.ideaReleased", { actor: actorName });
    case "idea_status_changed":
      return t("activity.ideaStatusChanged", { actor: actorName });
    default:
      return `${actorName}: ${action}`;
  }
}

export function IdeaDetailPanel({
  idea,
  projectUuid,
  currentUserUuid,
  isUsedInProposal,
  onClose,
  onDeleted,
}: IdeaDetailPanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editContent, setEditContent] = useState(idea.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAssign = idea.status === "open" || idea.status === "assigned" || idea.status === "in_progress";
  const canCreateProposal =
    idea.assignee?.uuid === currentUserUuid &&
    (idea.status === "assigned" || idea.status === "in_progress") &&
    !isUsedInProposal;
  const canEdit = idea.status !== "completed" && idea.status !== "closed";

  useEffect(() => {
    async function loadComments() {
      setIsLoadingComments(true);
      const result = await getIdeaCommentsAction(idea.uuid);
      setComments(result.comments);
      setIsLoadingComments(false);
    }
    async function loadActivities() {
      setIsLoadingActivities(true);
      const result = await getIdeaActivitiesAction(idea.uuid);
      setActivities(result.activities);
      setIsLoadingActivities(false);
    }
    loadComments();
    loadActivities();
  }, [idea.uuid]);

  // Reset edit state when idea changes
  useEffect(() => {
    setIsEditing(false);
    setEditTitle(idea.title);
    setEditContent(idea.content || "");
    setEditError(null);
  }, [idea.uuid, idea.title, idea.content]);

  const handleSubmitComment = async () => {
    if (!comment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const result = await createIdeaCommentAction(idea.uuid, comment);
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
    setEditTitle(idea.title);
    setEditContent(idea.content || "");
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(idea.title);
    setEditContent(idea.content || "");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError(t("ideas.titleRequired"));
      return;
    }

    setIsSaving(true);
    setEditError(null);

    const result = await updateIdeaAction({
      ideaUuid: idea.uuid,
      projectUuid,
      title: editTitle.trim(),
      content: editContent.trim() || null,
    });

    setIsSaving(false);

    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setEditError(result.error || t("ideas.updateFailed"));
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteIdeaAction(idea.uuid, projectUuid);
    setIsDeleting(false);

    if (result.success) {
      onDeleted?.();
      onClose();
      router.refresh();
    }
  };

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
                {t("ideas.editIdea")}
              </h2>
            ) : (
              <>
                <h2 className="text-base font-semibold text-[#2C2C2C] truncate">
                  {idea.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge className={statusColors[idea.status] || ""}>
                    {t(`status.${statusI18nKeys[idea.status] || idea.status}`)}
                  </Badge>
                  <span className="text-xs text-[#9A9A9A]">
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-[#E5E0D8]"
                onClick={handleStartEdit}
              >
                <Pencil className="h-4 w-4 text-[#6B6B6B]" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#E5E0D8]"
              onClick={isEditing ? handleCancelEdit : onClose}
            >
              <X className="h-4 w-4 text-[#6B6B6B]" />
            </Button>
          </div>
        </div>

        {/* Panel Body - Scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex min-h-full flex-col px-6 py-5">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-5">
                {editError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {editError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-[13px] font-medium text-[#2C2C2C]">
                    {t("ideas.titleLabel")}
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
                  <Label htmlFor="edit-content" className="text-[13px] font-medium text-[#2C2C2C]">
                    {t("common.content")}
                  </Label>
                  <Textarea
                    id="edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="border-[#E5E0D8] text-sm resize-none focus-visible:ring-[#C67A52]"
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Assignee Section */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("common.assignee")}
                  </label>
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-[#FAF8F4] p-3">
                    {idea.assignee ? (
                      <>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={idea.assignee.type === "agent" ? "bg-[#C67A52] text-white" : "bg-[#E5E0D8] text-[#6B6B6B]"}>
                            {idea.assignee.type === "agent" ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : (
                              idea.assignee.name.charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-[#2C2C2C]">
                            {idea.assignee.name}
                          </div>
                          <div className="text-xs text-[#6B6B6B]">
                            {idea.assignee.type === "agent"
                              ? `${t("common.agent")} • ${idea.assignee.assignedAt ? new Date(idea.assignee.assignedAt).toLocaleDateString() : ""}`
                              : t("common.user")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-[#9A9A9A]">{t("common.unassigned")}</span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="mt-5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                    {t("common.content")}
                  </label>
                  <div className="mt-2">
                    {idea.content ? (
                      <p className="text-[13px] leading-relaxed text-[#2C2C2C] whitespace-pre-wrap">
                        {idea.content}
                      </p>
                    ) : (
                      <p className="text-sm italic text-[#9A9A9A]">{t("common.noContent")}</p>
                    )}
                  </div>
                </div>

                {/* Activity Section */}
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

                {/* Comments Section */}
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
            )}
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
                      {t("ideas.saveChanges")}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {canAssign && (
                  <Button
                    variant="outline"
                    className="border-[#E5E0D8]"
                    onClick={() => setShowAssignModal(true)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {idea.assignee ? t("common.reassign") : t("common.assign")}
                  </Button>
                )}
                {canCreateProposal && (
                  <Link href={`/projects/${projectUuid}/proposals/new?ideaUuid=${idea.uuid}`}>
                    <Button className="bg-[#C67A52] hover:bg-[#B56A42] text-white">
                      <FileText className="mr-2 h-4 w-4" />
                      {t("proposals.createProposal")}
                    </Button>
                  </Link>
                )}
                {idea.status === "completed" || idea.status === "closed" ? (
                  <div className="text-sm text-[#9A9A9A] text-center w-full">
                    {idea.status === "completed" ? t("status.completed") : t("status.closed")}
                  </div>
                ) : null}
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
                        <AlertDialogTitle>{t("ideas.deleteIdea")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("ideas.deleteIdeaConfirm", { title: idea.title })}
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
            )}
          </div>
        </div>
      </div>

      {/* Assign Idea Modal */}
      {showAssignModal && (
        <AssignIdeaModal
          idea={{
            uuid: idea.uuid,
            title: idea.title,
            content: idea.content,
            status: idea.status,
            assignee: idea.assignee ? { type: idea.assignee.type, uuid: idea.assignee.uuid, name: idea.assignee.name } : null,
          }}
          projectUuid={projectUuid}
          currentUserUuid={currentUserUuid}
          onClose={() => {
            setShowAssignModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
