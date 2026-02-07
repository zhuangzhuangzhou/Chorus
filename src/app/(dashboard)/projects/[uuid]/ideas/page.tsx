// src/app/(dashboard)/projects/[uuid]/ideas/page.tsx
// Server Component - UUID 从 URL 获取

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { getServerAuthContext } from "@/lib/auth-server";
import { listIdeas } from "@/services/idea.service";
import { projectExists } from "@/services/project.service";
import { checkIdeasAvailability } from "@/services/proposal.service";
import { batchCommentCounts } from "@/services/comment.service";
import { IdeaCreateForm } from "./idea-create-form";
import { IdeasList } from "./ideas-list";

// 状态颜色配置
const statusColors: Record<string, string> = {
  open: "bg-[#FFF3E0] text-[#E65100]",
  assigned: "bg-[#E3F2FD] text-[#1976D2]",
  in_progress: "bg-[#E8F5E9] text-[#5A9E6F]",
  pending_review: "bg-[#F3E5F5] text-[#7B1FA2]",
  completed: "bg-[#E0F2F1] text-[#00796B]",
  closed: "bg-[#F5F5F5] text-[#9A9A9A]",
};

// 状态到翻译 key 的映射
const statusI18nKeys: Record<string, string> = {
  open: "open",
  assigned: "assigned",
  in_progress: "inProgress",
  pending_review: "pendingReview",
  completed: "completed",
  closed: "closed",
};


interface PageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ status?: string; assignedToMe?: string }>;
}

export default async function IdeasPage({ params, searchParams }: PageProps) {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const { uuid: projectUuid } = await params;
  const { status: filter = "all", assignedToMe } = await searchParams;
  const isAssignedToMeFilter = assignedToMe === "true";
  const t = await getTranslations();

  // 验证项目存在
  const exists = await projectExists(auth.companyUuid, projectUuid);
  if (!exists) {
    redirect("/projects");
  }

  // 获取所有 Ideas（用于计数）
  const { ideas: allIdeas } = await listIdeas({
    companyUuid: auth.companyUuid,
    projectUuid,
    skip: 0,
    take: 1000,
  });

  // 获取分配给我的 Ideas（用于计数）
  const { ideas: myIdeas } = await listIdeas({
    companyUuid: auth.companyUuid,
    projectUuid,
    skip: 0,
    take: 1000,
    assignedToMe: true,
    actorUuid: auth.actorUuid,
    actorType: auth.type,
  });

  // 计算各状态数量
  const statusCounts = allIdeas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 获取所有 Ideas 的可用性（是否已被 Proposal 使用）
  const allIdeaUuids = allIdeas.map(idea => idea.uuid);
  const availabilityCheck = allIdeaUuids.length > 0
    ? await checkIdeasAvailability(auth.companyUuid, allIdeaUuids)
    : { usedIdeas: [] };
  const usedIdeaUuids = availabilityCheck.usedIdeas.map(u => u.uuid);
  // idea UUID → proposal UUID mapping
  const ideaProposalMap: Record<string, string> = {};
  for (const u of availabilityCheck.usedIdeas) {
    ideaProposalMap[u.uuid] = u.proposalUuid;
  }

  // 批量获取评论数量
  const commentCounts = allIdeaUuids.length > 0
    ? await batchCommentCounts(auth.companyUuid, "idea", allIdeaUuids)
    : {};

  // 根据 filter 过滤
  let filteredIdeas = allIdeas;

  // First apply assignedToMe filter if active
  if (isAssignedToMeFilter) {
    filteredIdeas = myIdeas;
  }

  // Then apply status filter if not "all"
  if (filter !== "all") {
    filteredIdeas = filteredIdeas.filter((idea) => idea.status === filter);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("ideas.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("ideas.subtitle")}
        </p>
      </div>

      {/* Inline Create Form */}
      <div className="mb-6">
        <IdeaCreateForm projectUuid={projectUuid} />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        <Link href={`/projects/${projectUuid}/ideas`}>
          <Button variant={filter === "all" && !isAssignedToMeFilter ? "default" : "ghost"} size="sm">
            {t("ideas.all")} ({allIdeas.length})
          </Button>
        </Link>
        <Link href={`/projects/${projectUuid}/ideas?assignedToMe=true`}>
          <Button variant={isAssignedToMeFilter && filter === "all" ? "default" : "ghost"} size="sm">
            {t("ideas.assignedToMe")} ({myIdeas.length})
          </Button>
        </Link>
        {Object.keys(statusColors).map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== "open") return null;
          return (
            <Link key={status} href={`/projects/${projectUuid}/ideas?status=${status}${isAssignedToMeFilter ? "&assignedToMe=true" : ""}`}>
              <Button variant={filter === status ? "default" : "ghost"} size="sm">
                {t(`status.${statusI18nKeys[status]}`)} ({count})
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {filter === "all" ? t("ideas.noIdeas") : t("ideas.noIdeasWithStatus", { status: t(`status.${statusI18nKeys[filter] || filter}`) })}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {filter === "all"
              ? t("ideas.startByAdding")
              : t("ideas.ideasWithStatus")}
          </p>
        </Card>
      ) : (
        <IdeasList
          ideas={filteredIdeas.map(idea => ({
            ...idea,
            commentCount: commentCounts[idea.uuid] || 0,
          }))}
          projectUuid={projectUuid}
          currentUserUuid={auth.actorUuid}
          usedIdeaUuids={usedIdeaUuids}
          ideaProposalMap={ideaProposalMap}
        />
      )}
    </div>
  );
}
