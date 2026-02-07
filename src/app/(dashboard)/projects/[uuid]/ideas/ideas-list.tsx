"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bot, MessageSquare, FileText, User } from "lucide-react";
import {
  Card,
  CardHeader,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IdeaDetailPanel } from "./idea-detail-panel";

interface IdeaItem {
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
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
  commentCount: number;
}

interface IdeasListProps {
  ideas: IdeaItem[];
  projectUuid: string;
  currentUserUuid: string;
  usedIdeaUuids: string[];
  ideaProposalMap: Record<string, string>;
}

// Status badge styles: dot color + badge variant className
const statusBadgeStyles: Record<string, { dot: string; className: string }> = {
  open: { dot: "bg-[#2563EB]", className: "bg-[#DBEAFE] text-[#1D4ED8] border-transparent" },
  assigned: { dot: "bg-[#1976D2]", className: "bg-[#E3F2FD] text-[#1976D2] border-transparent" },
  in_progress: { dot: "bg-[#5A9E6F]", className: "bg-[#E8F5E9] text-[#2E7D32] border-transparent" },
  pending_review: { dot: "bg-[#FF9800]", className: "bg-[#FFF3E0] text-[#E65100] border-transparent" },
  completed: { dot: "bg-[#4CAF50]", className: "bg-[#E8F5E9] text-[#2E7D32] border-transparent" },
  closed: { dot: "bg-[#9A9A9A]", className: "bg-[#F5F5F5] text-[#6B6B6B] border-transparent" },
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

export function IdeasList({
  ideas,
  projectUuid,
  currentUserUuid,
  usedIdeaUuids,
  ideaProposalMap,
}: IdeasListProps) {
  const t = useTranslations();
  const [selectedIdeaUuid, setSelectedIdeaUuid] = useState<string | null>(null);
  const usedSet = new Set(usedIdeaUuids);

  // Derive selectedIdea from current props — always in sync with server data
  const selectedIdea = useMemo(
    () => (selectedIdeaUuid ? ideas.find((i) => i.uuid === selectedIdeaUuid) ?? null : null),
    [selectedIdeaUuid, ideas]
  );

  return (
    <>
      <div className="space-y-4">
        {ideas.map((idea) => {
          const badgeStyle = statusBadgeStyles[idea.status] || statusBadgeStyles.open;
          const isUsed = usedSet.has(idea.uuid);

          return (
            <Card
              key={idea.uuid}
              className="cursor-pointer border-[#E5E0D8] py-4 transition-all hover:border-[#C67A52]/50 hover:shadow-sm"
              onClick={() => setSelectedIdeaUuid(idea.uuid)}
            >
              {/* Header: Author meta + Status badge */}
              <CardHeader className="gap-0 py-0">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-[#E5E0D8] text-[#6B6B6B]">
                      {idea.createdBy?.type === "agent" ? (
                        <Bot className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-[#6B6B6B]">
                    {idea.createdBy?.name || "Unknown"}
                  </span>
                  <span className="text-[11px] text-[#9A9A9A]">•</span>
                  <span className="text-[11px] text-[#9A9A9A]">
                    {formatRelativeTime(idea.createdAt)}
                  </span>
                </div>
                <CardAction>
                  <Badge className={`gap-1.5 text-[10px] ${badgeStyle.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.dot}`} />
                    {isUsed
                      ? t("ideas.proposalGenerated")
                      : t(`status.${statusI18nKeys[idea.status] || idea.status}`)}
                  </Badge>
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-2 py-0">
                {/* Assigned To row */}
                {idea.assignee && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9A9A9A]">
                      {t("ideas.assignedTo")}:
                    </span>
                    <Badge className="gap-1.5 bg-[#F0F9FF] text-[#0284C7] border-transparent text-[10px]">
                      <Bot className="h-3 w-3" />
                      {idea.assignee.name}
                    </Badge>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-sm font-medium text-[#2C2C2C]">
                  {idea.title}
                </h3>

                {/* Content */}
                {idea.content && (
                  <p className="text-[13px] leading-relaxed text-[#2C2C2C] line-clamp-3">
                    {idea.content}
                  </p>
                )}
              </CardContent>

              {/* Actions row */}
              <CardFooter className="gap-4 py-0 text-[#6B6B6B]">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {idea.commentCount} {t("comments.title").toLowerCase()}
                  </span>
                </div>
                {isUsed && ideaProposalMap[idea.uuid] && (
                  <Link
                    href={`/projects/${projectUuid}/proposals/${ideaProposalMap[idea.uuid]}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[#C67A52] hover:text-[#B56A42] transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {t("ideas.viewProposal")}
                    </span>
                  </Link>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Side Panel */}
      {selectedIdea && (
        <IdeaDetailPanel
          idea={selectedIdea}
          projectUuid={projectUuid}
          currentUserUuid={currentUserUuid}
          isUsedInProposal={usedSet.has(selectedIdea.uuid)}
          onClose={() => setSelectedIdeaUuid(null)}
          onDeleted={() => setSelectedIdeaUuid(null)}
        />
      )}
    </>
  );
}
