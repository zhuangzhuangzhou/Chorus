// src/app/(dashboard)/projects/[uuid]/ideas/page.tsx
// Server Component - UUID 从 URL 获取

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Bot } from "lucide-react";
import { getServerAuthContext } from "@/lib/auth-server";
import { listIdeas } from "@/services/idea.service";
import { projectExists } from "@/services/project.service";
import { IdeaCreateForm } from "./idea-create-form";

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  assigned: { label: "Assigned", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  pending_review: { label: "Pending Review", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  completed: { label: "Completed", color: "bg-[#E0F2F1] text-[#00796B]" },
  closed: { label: "Closed", color: "bg-[#F5F5F5] text-[#9A9A9A]" },
};


interface PageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function IdeasPage({ params, searchParams }: PageProps) {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const { uuid: projectUuid } = await params;
  const { status: filter = "all" } = await searchParams;
  const t = await getTranslations();

  // 验证项目存在
  const exists = await projectExists(auth.companyUuid, projectUuid);
  if (!exists) {
    redirect("/projects");
  }

  // 获取所有 Ideas
  const { ideas: allIdeas } = await listIdeas({
    companyUuid: auth.companyUuid,
    projectUuid,
    skip: 0,
    take: 1000,
  });

  // 计算各状态数量
  const statusCounts = allIdeas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 根据 filter 过滤
  const filteredIdeas = filter === "all"
    ? allIdeas
    : allIdeas.filter((idea) => idea.status === filter);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("ideas.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("ideas.subtitle")}
          </p>
        </div>
        <IdeaCreateForm projectUuid={projectUuid} />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        <Link href={`/projects/${projectUuid}/ideas`}>
          <Button variant={filter === "all" ? "default" : "ghost"} size="sm">
            {t("ideas.all")} ({allIdeas.length})
          </Button>
        </Link>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== "open") return null;
          return (
            <Link key={status} href={`/projects/${projectUuid}/ideas?status=${status}`}>
              <Button variant={filter === status ? "default" : "ghost"} size="sm">
                {config.label} ({count})
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
            {filter === "all" ? t("ideas.noIdeas") : `No ${statusConfig[filter]?.label.toLowerCase()} ideas`}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {filter === "all"
              ? t("ideas.startByAdding")
              : t("ideas.ideasWithStatus")}
          </p>
          {filter === "all" && (
            <IdeaCreateForm projectUuid={projectUuid} />
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <Link key={idea.uuid} href={`/projects/${projectUuid}/ideas/${idea.uuid}`}>
              <Card className="group cursor-pointer p-4 transition-all hover:border-primary hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium text-foreground group-hover:text-primary">
                        {idea.title}
                      </h3>
                      <Badge className={statusConfig[idea.status]?.color || ""}>
                        {statusConfig[idea.status]?.label || idea.status}
                      </Badge>
                    </div>
                    {idea.content && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {idea.content}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </span>
                      {idea.assignee && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {idea.assignee.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
