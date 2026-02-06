"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Idea {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  claimedBy?: {
    uuid: string;
    name: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  claimed: { label: "Claimed", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  done: { label: "Done", color: "bg-[#F5F5F5] text-[#6B6B6B]" },
  rejected: { label: "Rejected", color: "bg-[#FFEBEE] text-[#D32F2F]" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-[#9A9A9A]" },
  medium: { label: "Medium", color: "text-[#E65100]" },
  high: { label: "High", color: "text-[#D32F2F]" },
};

export default function IdeaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params.uuid as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uuid) {
      fetchIdea();
    }
  }, [uuid]);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchIdea = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/ideas/${uuid}`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setIdea(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch idea:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !idea) return;

    try {
      const response = await fetch(`/api/projects/${projectUuid}/ideas/${uuid}/claim`, {
        method: "POST",
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchIdea();
      }
    } catch (error) {
      console.error("Failed to claim idea:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading idea...</div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[#6B6B6B]">Idea not found</div>
        <Link href="/ideas" className="mt-4 text-[#C67A52] hover:underline">
          Back to Ideas
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/ideas" className="text-[#6B6B6B] hover:text-[#2C2C2C]">
          Ideas
        </Link>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-[#9A9A9A]"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[#2C2C2C]">{idea.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <Badge className={statusConfig[idea.status]?.color || ""}>
              {statusConfig[idea.status]?.label || idea.status}
            </Badge>
            <span className={`text-sm font-medium ${priorityConfig[idea.priority]?.color || ""}`}>
              {priorityConfig[idea.priority]?.label || idea.priority} Priority
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">{idea.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[#6B6B6B]">
            <span>Created {new Date(idea.createdAt).toLocaleDateString()}</span>
            {idea.source && (
              <>
                <span>·</span>
                <span>Source: {idea.source}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {idea.status === "open" && (
            <Button
              onClick={handleClaim}
              className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
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
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Claim Idea
            </Button>
          )}
          <Button
            variant="outline"
            className="border-[#E5E0D8] text-[#6B6B6B]"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="border-[#E5E0D8] p-6">
            <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Description</h2>
            {idea.description ? (
              <div className="prose prose-sm max-w-none text-[#6B6B6B]">
                <p className="whitespace-pre-wrap">{idea.description}</p>
              </div>
            ) : (
              <p className="text-sm text-[#9A9A9A] italic">No description provided</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Assignment</h3>
            {idea.claimedBy ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3F2FD]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-[#1976D2]"
                  >
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-[#2C2C2C]">
                    {idea.claimedBy.name}
                  </div>
                  <div className="text-xs text-[#9A9A9A]">Agent</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#9A9A9A]">Unassigned</div>
            )}
          </Card>

          {/* Details */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Status</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {statusConfig[idea.status]?.label || idea.status}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Priority</dt>
                <dd className={`font-medium ${priorityConfig[idea.priority]?.color || ""}`}>
                  {priorityConfig[idea.priority]?.label || idea.priority}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Created</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(idea.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Updated</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(idea.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
