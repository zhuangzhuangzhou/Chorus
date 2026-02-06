"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  content: string;
  createdAt: string;
  updatedAt: string;
  proposal?: {
    uuid: string;
    title: string;
  };
}

const docTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  prd: { label: "PRD", color: "bg-[#E3F2FD] text-[#1976D2]", icon: "📋" },
  spec: { label: "Spec", color: "bg-[#E8F5E9] text-[#5A9E6F]", icon: "📝" },
  design: { label: "Design", color: "bg-[#F3E5F5] text-[#7B1FA2]", icon: "🎨" },
  note: { label: "Note", color: "bg-[#FFF3E0] text-[#E65100]", icon: "📒" },
  other: { label: "Other", color: "bg-[#F5F5F5] text-[#6B6B6B]", icon: "📄" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-[#FFF3E0] text-[#E65100]" },
  published: { label: "Published", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  archived: { label: "Archived", color: "bg-[#F5F5F5] text-[#6B6B6B]" },
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params.uuid as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (uuid) {
      fetchDocument();
    }
  }, [uuid]);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchDocument = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectUuid}/documents/${uuid}`, {
        headers: {
          "x-user-id": "1",
          "x-company-id": "1",
        },
      });
      const data = await response.json();
      if (data.success) {
        setDocument(data.data);
        setEditContent(data.data.content);
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !document) return;

    try {
      const response = await fetch(`/api/projects/${projectUuid}/documents/${uuid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await response.json();
      if (data.success) {
        setDocument(data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[#6B6B6B]">Document not found</div>
        <Link href="/documents" className="mt-4 text-[#C67A52] hover:underline">
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/documents" className="text-[#6B6B6B] hover:text-[#2C2C2C]">
          Documents
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
        <span className="text-[#2C2C2C]">{document.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F2EC] text-2xl">
            {docTypeConfig[document.docType]?.icon || "📄"}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-3">
              <Badge className={docTypeConfig[document.docType]?.color || ""}>
                {docTypeConfig[document.docType]?.label || document.docType}
              </Badge>
              <Badge className={statusConfig[document.status]?.color || ""}>
                {statusConfig[document.status]?.label || document.status}
              </Badge>
              <span className="rounded bg-[#F5F2EC] px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
                v{document.version}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#2C2C2C]">{document.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-[#6B6B6B]">
              <span>Last updated {new Date(document.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditContent(document.content);
                  setIsEditing(false);
                }}
                className="border-[#E5E0D8] text-[#6B6B6B]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#5A9E6F] hover:bg-[#4A8E5F] text-white"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsEditing(true)}
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
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                Edit
              </Button>
              <Button
                variant="outline"
                className="border-[#E5E0D8] text-[#6B6B6B]"
                onClick={() => router.back()}
              >
                Back
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Main Content */}
        <Card className="flex-1 overflow-auto border-[#E5E0D8] p-6">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full w-full resize-none rounded-lg border border-[#E5E0D8] p-4 font-mono text-sm focus:border-[#C67A52] focus:outline-none focus:ring-1 focus:ring-[#C67A52]"
              placeholder="Document content..."
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-[#2C2C2C]">
                {document.content}
              </div>
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Source Proposal */}
          {document.proposal && (
            <Card className="border-[#E5E0D8] p-4">
              <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Source Proposal</h3>
              <Link
                href={`/proposals/${document.proposal.uuid}`}
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {document.proposal.title}
              </Link>
            </Card>
          )}

          {/* Details */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Type</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {docTypeConfig[document.docType]?.label || document.docType}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Status</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {statusConfig[document.status]?.label || document.status}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Version</dt>
                <dd className="font-medium text-[#2C2C2C]">v{document.version}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Created</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(document.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[#9A9A9A]">Updated</dt>
                <dd className="font-medium text-[#2C2C2C]">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Version History */}
          <Card className="border-[#E5E0D8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#6B6B6B]">Version History</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#2C2C2C]">v{document.version}</span>
                <span className="text-xs text-[#9A9A9A]">Current</span>
              </div>
              {document.version > 1 && (
                <p className="text-xs text-[#9A9A9A]">
                  {document.version - 1} previous version{document.version > 2 ? "s" : ""}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
