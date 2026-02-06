"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface Activity {
  uuid: string;
  entityType: string;
  entityId: number;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  agent?: {
    name: string;
  };
  user?: {
    name: string;
  };
}

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  created: {
    label: "created",
    color: "text-[#5A9E6F]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  updated: {
    label: "updated",
    color: "text-[#1976D2]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  approved: {
    label: "approved",
    color: "text-[#5A9E6F]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  rejected: {
    label: "rejected",
    color: "text-[#D32F2F]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  claimed: {
    label: "claimed",
    color: "text-[#7B1FA2]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  completed: {
    label: "completed",
    color: "text-[#00796B]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
};

const entityTypeConfig: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-[#FFF3E0] text-[#E65100]" },
  proposal: { label: "Proposal", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  task: { label: "Task", color: "bg-[#E3F2FD] text-[#1976D2]" },
  document: { label: "Document", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  project: { label: "Project", color: "bg-[#FFF3E0] text-[#E65100]" },
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchActivities = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/activities`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setActivities(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const groupByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {};

    activities.forEach((activity) => {
      const date = new Date(activity.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      } else {
        key = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading activity...</div>
      </div>
    );
  }

  const groupedActivities = groupByDate(activities);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">Activity</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Recent activity across your project
        </p>
      </div>

      {/* Activity Feed */}
      {activities.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-[#E5E0D8]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F2EC]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[#6B6B6B]"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#2C2C2C]">
            No activity yet
          </h3>
          <p className="max-w-sm text-sm text-[#6B6B6B]">
            Activity will appear here as you and your agents work on this project.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="mb-4 text-sm font-medium text-[#6B6B6B]">{dateLabel}</h3>
              <div className="space-y-3">
                {items.map((activity) => {
                  const actionConf = actionConfig[activity.action] || actionConfig.updated;
                  const entityConf = entityTypeConfig[activity.entityType] || entityTypeConfig.project;
                  const actorName = activity.agent?.name || activity.user?.name || "System";
                  const isAgent = !!activity.agent;

                  return (
                    <Card
                      key={activity.uuid}
                      className="flex items-start gap-4 border-[#E5E0D8] p-4"
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${isAgent ? "bg-[#E3F2FD]" : "bg-[#F5F2EC]"}`}>
                        {isAgent ? (
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
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-[#6B6B6B]"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#2C2C2C]">{actorName}</span>
                          <span className={actionConf.color}>{actionConf.label}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${entityConf.color}`}>
                            {entityConf.label}
                          </span>
                        </div>
                        {activity.metadata && typeof activity.metadata === "object" && "title" in activity.metadata && (
                          <p className="mt-1 text-sm text-[#6B6B6B] truncate">
                            {String(activity.metadata.title)}
                          </p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-[#9A9A9A] whitespace-nowrap">
                        {formatDate(activity.createdAt)}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
