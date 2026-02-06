"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Proposal {
  uuid: string;
  title: string;
  proposalType: string;
  status: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
  idea?: {
    uuid: string;
    title: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-[#FFF3E0] text-[#E65100]" },
  approved: { label: "Approved", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  rejected: { label: "Rejected", color: "bg-[#FFEBEE] text-[#D32F2F]" },
  revised: { label: "Revised", color: "bg-[#E3F2FD] text-[#1976D2]" },
};

const typeConfig: Record<string, { label: string; icon: string }> = {
  prd: { label: "PRD", icon: "📋" },
  tasks: { label: "Task Breakdown", icon: "📝" },
  doc_update: { label: "Document Update", icon: "📄" },
  tech_spec: { label: "Tech Spec", icon: "⚙️" },
};

export default function ProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params.uuid as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (uuid) {
      fetchProposal();
    }
  }, [uuid]);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchProposal = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/proposals/${uuid}`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setProposal(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch proposal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !proposal) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/proposals/${uuid}/approve`, {
        method: "POST",
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchProposal();
      }
    } catch (error) {
      console.error("Failed to approve proposal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !proposal) return;

    if (!confirm("Are you sure you want to reject this proposal?")) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/proposals/${uuid}/reject`, {
        method: "POST",
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchProposal();
      }
    } catch (error) {
      console.error("Failed to reject proposal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading proposal...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[#6B6B6B]">Proposal not found</div>
        <Link href="/proposals" className="mt-4 text-[#C67A52] hover:underline">
          Back to Proposals
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/proposals" className="text-[#6B6B6B] hover:text-[#2C2C2C]">
          Proposals
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
        <span className="text-[#2C2C2C]">{proposal.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F2EC] text-2xl">
            {typeConfig[proposal.proposalType]?.icon || "📋"}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-3">
              <Badge className={statusConfig[proposal.status]?.color || ""}>
                {statusConfig[proposal.status]?.label || proposal.status}
              </Badge>
              <span className="text-sm text-[#6B6B6B]">
                {typeConfig[proposal.proposalType]?.label || proposal.proposalType}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#2C2C2C]">{proposal.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-[#6B6B6B]">
              <span>Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
              {proposal.creatorName && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
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
                      <path d="M12 8V4H8" />
                      <rect width="16" height="12" x="4" y="8" rx="2" />
                    </svg>
                    {proposal.creatorName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {proposal.status === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={submitting}
                className="border-[#D32F2F] text-[#D32F2F] hover:bg-[#FFEBEE]"
              >
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="bg-[#5A9E6F] hover:bg-[#4A8E5F] text-white"
              >
                {submitting ? "Processing..." : "Approve"}
              </Button>
            </>
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
            <h2 className="mb-4 text-lg font-medium text-[#2C2C2C]">Content</h2>
            <div className="prose prose-sm max-w-none text-[#6B6B6B]">
              <div className="whitespace-pre-wrap rounded-lg bg-[#F5F2EC] p-4 font-mono text-sm">
                {proposal.content}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Source Idea */}
          {proposal.idea && (
            <Card className="border-[#E5E0D8] p-4">
              <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Source Idea</h3>
              <Link
                href={`/ideas/${proposal.idea.uuid}`}
                className="flex items-center gap-2 text-sm text-[#C67A52] hover:underline"
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
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
                {proposal.idea.title}
              </Link>
            </Card>
          )}

          {/* Details */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Status</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {statusConfig[proposal.status]?.label || proposal.status}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Type</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {typeConfig[proposal.proposalType]?.label || proposal.proposalType}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Created</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(proposal.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Updated</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(proposal.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Actions */}
          {proposal.status === "pending" && (
            <Card className="border-[#C67A52] bg-[#FFFBF8] p-4">
              <div className="flex items-center gap-2 text-sm text-[#E65100]">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Awaiting your review
              </div>
              <p className="mt-2 text-xs text-[#6B6B6B]">
                Review the content and approve or reject this proposal.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
