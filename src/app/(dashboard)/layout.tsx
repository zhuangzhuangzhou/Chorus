"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface User {
  uuid: string;
  email: string;
  name: string;
}

interface Project {
  uuid: string;
  name: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  // Determine if we're in a project context
  // Global pages: /projects, /projects/new, /settings
  // Project pages: /projects/[uuid], /dashboard, /ideas, /tasks, etc.
  const isGlobalPage =
    pathname === "/projects" ||
    pathname === "/projects/new" ||
    pathname === "/settings";
  const isProjectContext = currentProject && !isGlobalPage;

  useEffect(() => {
    checkSession();
    fetchProjects();
  }, []);

  // Watch for pathname changes to update currentProject when entering /projects/[uuid]
  useEffect(() => {
    if (projects.length === 0) return;

    // Check if we're on a project detail page /projects/[uuid]
    const projectDetailMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectDetailMatch) {
      const projectUuid = projectDetailMatch[1];
      // Don't match "new"
      if (projectUuid !== "new") {
        const project = projects.find((p) => p.uuid === projectUuid);
        if (project && currentProject?.uuid !== projectUuid) {
          setCurrentProject(project);
          localStorage.setItem("currentProjectUuid", projectUuid);
        }
      }
    }
  }, [pathname, projects, currentProject?.uuid]);

  const checkSession = async () => {
    // TODO: Implement proper session check
    // For MVP, we'll use a mock user
    setUser({
      uuid: "mock-user",
      email: "user@example.com",
      name: "Demo User",
    });
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects", {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setProjects(data.data);
        // Set first project as current if none selected
        const savedProjectUuid = localStorage.getItem("currentProjectUuid");
        const savedProject = data.data.find(
          (p: Project) => p.uuid === savedProjectUuid
        );
        setCurrentProject(savedProject || data.data[0]);
        if (!savedProject && data.data[0]) {
          localStorage.setItem("currentProjectUuid", data.data[0].uuid);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem("currentProjectUuid", project.uuid);
    setProjectMenuOpen(false);
    // Navigate to project dashboard after selection
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    localStorage.removeItem("currentProjectUuid");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
        <div className="text-[#6B6B6B]">Loading...</div>
      </div>
    );
  }

  // Project navigation items (shown when inside a project)
  const projectNavItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      href: "/ideas",
      label: "Ideas",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      ),
    },
    {
      href: "/documents",
      label: "Documents",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      href: "/proposals",
      label: "Proposals",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" />
          <path d="M6 9.01V9" />
          <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19" />
        </svg>
      ),
    },
    {
      href: "/tasks",
      label: "Tasks",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m9 11 3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      href: "/activity",
      label: "Activity",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];

  // Global navigation items (shown when NOT in a project)
  const globalNavItems = [
    {
      href: "/projects",
      label: "Projects",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      ),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/projects") {
      return pathname === "/projects" || pathname.startsWith("/projects/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8F4]">
      {/* Sidebar */}
      <aside className="flex w-[220px] flex-shrink-0 flex-col justify-between border-r border-[#E5E0D8] bg-white">
        <div className="flex flex-col gap-8 p-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-[#2C2C2C]"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-base font-semibold text-[#2C2C2C]">
              Chorus
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {isProjectContext ? (
              <>
                {/* Back to Projects (shown in project context) */}
                <Link
                  href="/projects"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-[#6B6B6B] transition-colors hover:bg-[#F5F2EC] hover:text-[#2C2C2C]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="m12 19-7-7 7-7" />
                    <path d="M19 12H5" />
                  </svg>
                  Projects
                </Link>

                {/* Current Project Selector */}
                {currentProject && (
                  <div className="relative mt-2">
                    <button
                      onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]">
                        {currentProject.name}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-3 w-3 text-[#6B6B6B] transition-transform ${projectMenuOpen ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {projectMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-[#E5E0D8] bg-white py-1 shadow-lg">
                        {projects.map((project) => (
                          <button
                            key={project.uuid}
                            onClick={() => selectProject(project)}
                            className={`flex w-full px-3 py-2 text-left text-[13px] hover:bg-[#F5F2EC] ${
                              currentProject?.uuid === project.uuid
                                ? "bg-[#F5F2EC] font-medium text-[#2C2C2C]"
                                : "text-[#6B6B6B]"
                            }`}
                          >
                            {project.name}
                          </button>
                        ))}
                        <div className="my-1 border-t border-[#E5E0D8]" />
                        <Link
                          href="/projects/new"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#C67A52] hover:bg-[#F5F2EC]"
                          onClick={() => setProjectMenuOpen(false)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          New Project
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Navigation Items */}
                <div className="mt-2 flex flex-col gap-1">
                  {projectNavItems.map((item) => {
                    const isActive = isNavActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                          isActive
                            ? "bg-[#F5F2EC] font-medium text-[#2C2C2C]"
                            : "text-[#6B6B6B] hover:bg-[#F5F2EC] hover:text-[#2C2C2C]"
                        }`}
                      >
                        <span className={isActive ? "text-[#C67A52]" : ""}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Global Navigation Items (Projects, Settings) */}
                <div className="flex flex-col gap-1">
                  {globalNavItems.map((item) => {
                    const isActive = isNavActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                          isActive
                            ? "bg-[#F5F2EC] font-medium text-[#2C2C2C]"
                            : "text-[#6B6B6B] hover:bg-[#F5F2EC] hover:text-[#2C2C2C]"
                        }`}
                      >
                        <span className={isActive ? "text-[#2C2C2C]" : ""}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C67A52] text-sm font-medium text-white">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[#2C2C2C]">
                {user?.name}
              </div>
              <div className="truncate text-[11px] text-[#9A9A9A]">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#9A9A9A] hover:text-[#6B6B6B]"
              title="Sign out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
