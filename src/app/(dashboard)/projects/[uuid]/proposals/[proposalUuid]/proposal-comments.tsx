"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bot, User, Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getProposalCommentsAction,
  createProposalCommentAction,
} from "./comment-actions";
import type { CommentResponse } from "@/services/comment.service";
import { Streamdown } from "streamdown";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRelativeTime(dateString: string, t: any): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("time.justNow");
  if (diffMins < 60) return t("time.minutesAgo", { minutes: diffMins });
  if (diffHours < 24) return t("time.hoursAgo", { hours: diffHours });
  if (diffDays < 7) return t("time.daysAgo", { days: diffDays });
  return date.toLocaleDateString();
}

interface ProposalCommentsProps {
  proposalUuid: string;
}

export function ProposalComments({ proposalUuid }: ProposalCommentsProps) {
  const t = useTranslations();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadComments() {
      setIsLoading(true);
      const result = await getProposalCommentsAction(proposalUuid);
      setComments(result.comments);
      setIsLoading(false);
    }
    loadComments();
  }, [proposalUuid]);

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createProposalCommentAction(proposalUuid, comment);
    setIsSubmitting(false);

    if (result.success && result.comment) {
      setComments((prev) => [...prev, result.comment!]);
      setComment("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="border-[#E5E0D8] p-4">
      <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">
        {t("comments.title")}
      </h3>

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[#9A9A9A]" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[#9A9A9A] italic">{t("comments.noComments")}</p>
        ) : (
          comments.map((c) => (
            <div key={c.uuid} className="flex gap-2.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className={
                    c.author.type === "agent"
                      ? "bg-[#C67A52] text-white"
                      : "bg-[#E5E0D8] text-[#6B6B6B] text-[10px]"
                  }
                >
                  {c.author.type === "agent" ? (
                    <Bot className="h-3 w-3" />
                  ) : (
                    c.author.name.charAt(0).toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#2C2C2C]">
                    {c.author.name}
                  </span>
                  <span className="text-[10px] text-[#9A9A9A]">
                    {formatRelativeTime(c.createdAt, t)}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-[#2C2C2C]">
                  <Streamdown>{c.content}</Streamdown>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
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
            disabled={isSubmitting}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            disabled={!comment.trim() || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9A9A9A]" />
            ) : (
              <Send className="h-3.5 w-3.5 text-[#C67A52]" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
