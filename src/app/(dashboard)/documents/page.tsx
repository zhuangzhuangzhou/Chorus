"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Document {
  uuid: string;
  title: string;
  docType: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const docTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  prd: { label: "PRD", color: "bg-[#E3F2FD] text-[#1976D2]", icon: "📋" },
  spec: { label: "Spec", color: "bg-[#E8F5E9] text-[#5A9E6F]", icon: "📝" },
  design: { label: "Design", color: "bg-[#F3E5F5] text-[#7B1FA2]", icon: "🎨" },
  note: { label: "Note", color: "bg-[#FFF3E0] text-[#E65100]", icon: "📒" },
  other: { label: "Other", color: "bg-[#F5F5F5] text-[#6B6B6B]", icon: "📄" },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchDocuments = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/documents`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = filter === "all"
    ? documents
    : documents.filter((doc) => doc.docType === filter);

  const typeCounts = documents.reduce((acc, doc) => {
    acc[doc.docType] = (acc[doc.docType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">Documents</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            PRDs, specs, and project documentation
          </p>
        </div>
        <Button className="bg-[#C67A52] hover:bg-[#B56A42] text-white">
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
          New Document
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
          All ({documents.length})
        </button>
        {Object.entries(docTypeConfig).map(([type, config]) => {
          const count = typeCounts[type] || 0;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === type
                  ? "bg-[#2C2C2C] text-white"
                  : "text-[#6B6B6B] hover:bg-[#F5F2EC]"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-[#E5E0D8]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F5E9]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[#5A9E6F]"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-[#2C2C2C]">
            No documents yet
          </h3>
          <p className="mb-6 max-w-sm text-sm text-[#6B6B6B]">
            Documents are created when proposals are approved. You can also create documents manually.
          </p>
          <Button className="bg-[#C67A52] hover:bg-[#B56A42] text-white">
            Create Document
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Link key={doc.uuid} href={`/documents/${doc.uuid}`}>
              <Card className="group cursor-pointer border-[#E5E0D8] p-5 transition-all hover:border-[#C67A52] hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F2EC] text-xl">
                    {docTypeConfig[doc.docType]?.icon || "📄"}
                  </div>
                  <Badge className={docTypeConfig[doc.docType]?.color || ""}>
                    {docTypeConfig[doc.docType]?.label || doc.docType}
                  </Badge>
                </div>
                <h3 className="mb-1 font-medium text-[#2C2C2C] group-hover:text-[#C67A52]">
                  {doc.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#9A9A9A]">
                  <span>v{doc.version}</span>
                  <span>·</span>
                  <span>
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
