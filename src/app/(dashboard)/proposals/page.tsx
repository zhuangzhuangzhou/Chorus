"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Proposal {
  uuid: string;
  title: string;
  proposalType: string;
  status: string;
  createdAt: string;
  creatorName?: string;
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

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchProposals();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchProposals = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/proposals`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setProposals(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = filter === "all"
    ? proposals
    : proposals.filter((p) => p.status === filter);

  const statusCounts = proposals.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading proposals...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">Proposals</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Review and approve AI-generated proposals
          </p>
        </div>
        {statusCounts.pending > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FFF3E0] px-3 py-2 text-sm text-[#E65100]">
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
            {statusCounts.pending} pending review
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[#E5E2DC] pb-4">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-[#2C2C2C] text-white"
              : "text-[#6B6B6B] hover:bg-[#F5F2EC]"
          }`}
        >
          All ({proposals.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== "pending") return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-[#2C2C2C] text-white"
                  : "text-[#6B6B6B] hover:bg-[#F5F2EC]"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-[#E5E0D8]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3E5F5]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[#7B1FA2]"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#2C2C2C]">
            No proposals yet
          </h3>
          <p className="mb-6 max-w-sm text-sm text-[#6B6B6B]">
            Proposals are created by PM Agents when they analyze ideas. They will appear here for your review.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal) => (
            <Link key={proposal.uuid} href={`/proposals/${proposal.uuid}`}>
              <Card className="group cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F2EC] text-2xl">
                      {typeConfig[proposal.proposalType]?.icon || "📋"}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-medium text-[#2C2C2C] group-hover:text-[#C67A52]">
                          {proposal.title}
                        </h3>
                        <Badge className={statusConfig[proposal.status]?.color || ""}>
                          {statusConfig[proposal.status]?.label || proposal.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                        <span>{typeConfig[proposal.proposalType]?.label || proposal.proposalType}</span>
                        <span>·</span>
                        <span>
                          {new Date(proposal.createdAt).toLocaleDateString()}
                        </span>
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
                  {proposal.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#D32F2F] text-[#D32F2F] hover:bg-[#FFEBEE]"
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: Reject
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#5A9E6F] hover:bg-[#4A8E5F] text-white"
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: Approve
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
