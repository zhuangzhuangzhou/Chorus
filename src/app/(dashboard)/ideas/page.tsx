"use client";

import { useEffect, useState } from "react";
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
  assigneeType: string | null;
  assigneeName?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  assigned: { label: "Assigned", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  pending_review: { label: "Pending Review", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  completed: { label: "Completed", color: "bg-[#E0F2F1] text-[#00796B]" },
  closed: { label: "Closed", color: "bg-[#F5F5F5] text-[#9A9A9A]" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-[#9A9A9A]" },
  medium: { label: "Medium", color: "text-[#C67A52]" },
  high: { label: "High", color: "text-[#D32F2F]" },
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: "", description: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchIdeas = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/ideas`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setIdeas(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch ideas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !newIdea.title.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectUuid}/ideas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify(newIdea),
      });
      const data = await response.json();
      if (data.success) {
        setIdeas([data.data, ...ideas]);
        setNewIdea({ title: "", description: "", priority: "medium" });
        setShowNewForm(false);
      }
    } catch (error) {
      console.error("Failed to create idea:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIdeas = filter === "all"
    ? ideas
    : ideas.filter((idea) => idea.status === filter);

  const statusCounts = ideas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading ideas...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">Ideas</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Capture and track ideas for your project
          </p>
        </div>
        <Button
          onClick={() => setShowNewForm(true)}
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Idea
        </Button>
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
          All ({ideas.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== "open") return null;
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

      {/* New Idea Form */}
      {showNewForm && (
        <Card className="mb-6 border-[#C67A52] p-5">
          <form onSubmit={handleCreateIdea} className="space-y-4">
            <div>
              <input
                type="text"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                placeholder="What's your idea?"
                className="w-full border-0 bg-transparent text-lg font-medium placeholder:text-[#9A9A9A] focus:outline-none focus:ring-0"
                autoFocus
              />
            </div>
            <div>
              <textarea
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                placeholder="Add more details..."
                rows={3}
                className="w-full resize-none border-0 bg-transparent text-sm placeholder:text-[#9A9A9A] focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {["low", "medium", "high"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewIdea({ ...newIdea, priority: p })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      newIdea.priority === p
                        ? "bg-[#2C2C2C] text-white"
                        : "bg-[#F5F2EC] text-[#6B6B6B] hover:bg-[#EBE8E2]"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewForm(false)}
                  className="text-[#6B6B6B]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newIdea.title.trim() || submitting}
                  className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
                >
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-[#E5E0D8]">
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
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#2C2C2C]">
            {filter === "all" ? "No ideas yet" : `No ${statusConfig[filter]?.label.toLowerCase()} ideas`}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-[#6B6B6B]">
            {filter === "all"
              ? "Start by adding your first idea. Ideas can be picked up by AI agents for analysis."
              : "Ideas with this status will appear here."}
          </p>
          {filter === "all" && (
            <Button
              onClick={() => setShowNewForm(true)}
              className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
            >
              Add First Idea
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <Link key={idea.uuid} href={`/ideas/${idea.uuid}`}>
              <Card className="group cursor-pointer border-[#E5E0D8] p-4 transition-all hover:border-[#C67A52] hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium text-[#2C2C2C] group-hover:text-[#C67A52]">
                        {idea.title}
                      </h3>
                      <Badge className={statusConfig[idea.status]?.color || ""}>
                        {statusConfig[idea.status]?.label || idea.status}
                      </Badge>
                      {idea.priority !== "medium" && (
                        <span className={`text-xs font-medium ${priorityConfig[idea.priority]?.color}`}>
                          {priorityConfig[idea.priority]?.label}
                        </span>
                      )}
                    </div>
                    {idea.description && (
                      <p className="line-clamp-2 text-sm text-[#6B6B6B]">
                        {idea.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#9A9A9A]">
                      <span>
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </span>
                      {idea.assigneeName && (
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
                            {idea.assigneeName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {idea.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 border-[#C67A52] text-[#C67A52] hover:bg-[#FFF3E0]"
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Open claim modal
                      }}
                    >
                      Claim
                    </Button>
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
