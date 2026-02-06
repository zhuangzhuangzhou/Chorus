"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  ideas: { total: number; open: number };
  tasks: { total: number; inProgress: number };
  proposals: { total: number; pending: number };
  documents: { total: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProject, setHasProject] = useState(false);

  useEffect(() => {
    checkProjectAndFetchStats();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const checkProjectAndFetchStats = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setHasProject(false);
      setLoading(false);
      return;
    }

    setHasProject(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/stats`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading...</div>
      </div>
    );
  }

  if (!hasProject) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="flex max-w-md flex-col items-center p-8 text-center border-[#E5E0D8]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3E0]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[#E65100]"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#2C2C2C]">Welcome to Chorus</h2>
          <p className="mb-6 text-sm text-[#6B6B6B]">
            Get started by creating your first project or selecting an existing one.
          </p>
          <div className="flex gap-3">
            <Link href="/projects">
              <Button variant="outline" className="border-[#E5E0D8]">
                View Projects
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button className="bg-[#C67A52] hover:bg-[#B56A42] text-white">
                Create Project
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Overview of your project activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/ideas">
          <Card className="cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF3E0]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#E65100]"
              >
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-[#2C2C2C]">
              {stats?.ideas.total || 0}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6B]">Ideas</span>
              {(stats?.ideas.open || 0) > 0 && (
                <span className="rounded bg-[#FFF3E0] px-2 py-0.5 text-xs font-medium text-[#E65100]">
                  {stats?.ideas.open} open
                </span>
              )}
            </div>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#E3F2FD]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#1976D2]"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-[#2C2C2C]">
              {stats?.tasks.total || 0}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6B]">Tasks</span>
              {(stats?.tasks.inProgress || 0) > 0 && (
                <span className="rounded bg-[#E8F5E9] px-2 py-0.5 text-xs font-medium text-[#5A9E6F]">
                  {stats?.tasks.inProgress} active
                </span>
              )}
            </div>
          </Card>
        </Link>

        <Link href="/proposals">
          <Card className="cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3E5F5]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#7B1FA2]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-[#2C2C2C]">
              {stats?.proposals.total || 0}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6B]">Proposals</span>
              {(stats?.proposals.pending || 0) > 0 && (
                <span className="rounded bg-[#FFF3E0] px-2 py-0.5 text-xs font-medium text-[#E65100]">
                  {stats?.proposals.pending} pending
                </span>
              )}
            </div>
          </Card>
        </Link>

        <Link href="/documents">
          <Card className="cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5E9]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#5A9E6F]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-[#2C2C2C]">
              {stats?.documents.total || 0}
            </div>
            <div className="text-sm text-[#6B6B6B]">Documents</div>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#E5E0D8] p-6">
          <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/ideas">
              <Button
                variant="outline"
                className="w-full justify-start border-[#E5E0D8] text-[#6B6B6B] hover:border-[#C67A52] hover:text-[#C67A52]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add New Idea
              </Button>
            </Link>
            <Link href="/proposals">
              <Button
                variant="outline"
                className="w-full justify-start border-[#E5E0D8] text-[#6B6B6B] hover:border-[#C67A52] hover:text-[#C67A52]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Review Proposals
              </Button>
            </Link>
            <Link href="/tasks">
              <Button
                variant="outline"
                className="w-full justify-start border-[#E5E0D8] text-[#6B6B6B] hover:border-[#C67A52] hover:text-[#C67A52]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                View Task Board
              </Button>
            </Link>
            <Link href="/agents">
              <Button
                variant="outline"
                className="w-full justify-start border-[#E5E0D8] text-[#6B6B6B] hover:border-[#C67A52] hover:text-[#C67A52]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                </svg>
                Manage Agents
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="border-[#E5E0D8] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#2C2C2C]">Recent Activity</h2>
            <Link href="/activity" className="text-sm text-[#C67A52] hover:underline">
              View all
            </Link>
          </div>
          <div className="flex h-32 items-center justify-center text-sm text-[#9A9A9A]">
            Activity feed will appear here
          </div>
        </Card>
      </div>
    </div>
  );
}
