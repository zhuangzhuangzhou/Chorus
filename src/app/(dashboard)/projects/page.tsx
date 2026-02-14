// Server Component - Projects list with IH design
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderOpen, Lightbulb, ClipboardList, FileText } from "lucide-react";
import { getServerAuthContext } from "@/lib/auth-server";
import { listProjectsWithStats, getCompanyOverviewStats } from "@/services/project.service";

// Avatar color palette based on project name hash
const AVATAR_COLORS = [
  "#C67A52", // terracotta
  "#1976D2", // blue
  "#5A9E6F", // green
  "#8E6BBF", // purple
  "#D4805A", // warm orange
  "#2E86AB", // teal
  "#A45A52", // muted red
  "#6B8E5A", // olive
];

function getProjectInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default async function ProjectsPage() {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const t = await getTranslations();

  const [{ projects }, overview] = await Promise.all([
    listProjectsWithStats({
      companyUuid: auth.companyUuid,
      skip: 0,
      take: 100,
    }),
    getCompanyOverviewStats(auth.companyUuid),
  ]);

  const projectList = projects.map((p) => ({
    uuid: p.uuid,
    name: p.name,
    description: p.description,
    updatedAt: p.updatedAt,
    counts: {
      ideas: p._count.ideas,
      tasks: p._count.tasks,
      documents: p._count.documents,
      proposals: p._count.proposals,
    },
    tasksDone: p.tasksDone,
    progress: p._count.tasks > 0 ? Math.round((p.tasksDone / p._count.tasks) * 100) : 0,
  }));

  return (
    <div className="min-h-full bg-[#FAF8F4] p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">
            {t("projects.title")}
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            {t("projects.subtitle")}
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="rounded-xl bg-[#C67A52] px-5 text-white hover:bg-[#B56A42]">
            <Plus className="mr-2 h-4 w-4" />
            {t("projects.newProject")}
          </Button>
        </Link>
      </div>

      {projectList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-[#E5E0D8] p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F2EC]">
            <FolderOpen className="h-8 w-8 text-[#C67A52]" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#2C2C2C]">
            {t("projects.noProjects")}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-[#6B6B6B]">
            {t("projects.noProjectsDesc")}
          </p>
          <Link href="/projects/new">
            <Button className="bg-[#C67A52] text-white hover:bg-[#B56A42]">
              {t("projects.createFirst")}
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Stats Overview Row */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <Card className="rounded-2xl border-[#E5E2DC] p-5 shadow-none">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9A9A9A]">
                {t("projects.activeProjects")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#2C2C2C]">
                {overview.projects}
              </p>
            </Card>
            <Card className="rounded-2xl border-[#E5E2DC] p-5 shadow-none">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9A9A9A]">
                {t("projects.totalTasks")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#C67A52]">
                {overview.tasks}
              </p>
            </Card>
            <Card className="rounded-2xl border-[#E5E2DC] p-5 shadow-none">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9A9A9A]">
                {t("projects.openProposals")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#5A9E6F]">
                {overview.openProposals}
              </p>
            </Card>
            <Card className="rounded-2xl border-[#E5E2DC] p-5 shadow-none">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9A9A9A]">
                {t("projects.ideasCaptured")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#2C2C2C]">
                {overview.ideas}
              </p>
            </Card>
          </div>

          {/* Projects Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-5">
            {projectList.map((project) => {
              const initials = getProjectInitials(project.name);
              const avatarColor = getAvatarColor(project.name);
              return (
                <Link key={project.uuid} href={`/projects/${project.uuid}/dashboard`}>
                  <Card className="group cursor-pointer rounded-2xl border-[#E5E2DC] p-6 shadow-none transition-all hover:border-[#C67A52] hover:shadow-md">
                    {/* Header: Avatar + Name + Badge */}
                    <div className="mb-3 flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-[#2C2C2C] group-hover:text-[#C67A52]">
                            {project.name}
                          </h3>
                          <Badge variant="success" className="gap-1 border-0 bg-[#5A9E6F15] text-[10px] text-[#5A9E6F]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5A9E6F]" />
                            Active
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#6B6B6B]">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] text-[#9A9A9A]">
                          {t("projects.taskProgress")}
                        </span>
                        <span className="text-[11px] font-medium text-[#2C2C2C]">
                          {project.progress}%
                        </span>
                      </div>
                      <Progress value={project.progress} />
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-[11px] text-[#9A9A9A]">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3 w-3" />
                          {project.counts.tasks} {t("projects.tasks")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          {project.counts.ideas} {t("projects.ideas")}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {project.counts.documents} {t("projects.docs")}
                        </span>
                      </div>
                      <span>
                        {t("projects.updated")} {formatRelativeDate(new Date(project.updatedAt))}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}

            {/* New Project Card */}
            <Link href="/projects/new">
              <Card className="flex h-full min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D0CCC4] bg-[#F5F2EC] shadow-none transition-all hover:border-[#C67A52] hover:bg-[#EDE9E3]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C67A5220]">
                  <Plus className="h-5 w-5 text-[#C67A52]" />
                </div>
                <p className="text-sm font-semibold text-[#2C2C2C]">
                  {t("projects.createNewProject")}
                </p>
                <p className="max-w-[200px] text-center text-xs text-[#9A9A9A]">
                  {t("projects.createNewProjectDesc")}
                </p>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
