"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UploadedFile {
  name: string;
  size: number;
  file: File;
}

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [ideas, setIdeas] = useState<string[]>([""]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleAddIdea = () => {
    setIdeas([...ideas, ""]);
  };

  const handleIdeaChange = (index: number, value: string) => {
    const newIdeas = [...ideas];
    newIdeas[index] = value;
    setIdeas(newIdeas);
  };

  const handleRemoveIdea = (index: number) => {
    if (ideas.length > 1) {
      const newIdeas = ideas.filter((_, i) => i !== index);
      setIdeas(newIdeas);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check file size (10MB limit)
      if (file.size <= 10 * 1024 * 1024) {
        newFiles.push({
          name: file.name,
          size: file.size,
          file: file,
        });
      }
    }
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create project
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        const projectUuid = data.data.uuid;

        // Create ideas if any
        const validIdeas = ideas.filter((idea) => idea.trim());
        for (const ideaContent of validIdeas) {
          await fetch("/api/ideas", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": "1",
              "x-company-id": "1",
              "x-project-uuid": projectUuid,
            },
            body: JSON.stringify({
              title: ideaContent.slice(0, 100),
              description: ideaContent,
            }),
          });
        }

        // TODO: Upload documents when API is ready

        // Save as current project and redirect
        localStorage.setItem("currentProjectUuid", projectUuid);
        router.push(`/projects/${projectUuid}`);
      } else {
        setError(data.error?.message || "Failed to create project");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FAF8F4]">
      <div className="px-8 py-6">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-[11px] text-[#9A9A9A]">
            <Link href="/projects" className="hover:text-[#6B6B6B]">
              Projects
            </Link>
            <span className="mx-1">/</span>
            <span>New Project</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[#9A9A9A] hover:text-[#6B6B6B]">
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
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            <div className="h-7 w-7 rounded-full bg-[#E5E0D8]" />
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">
            Create New Project
          </h1>
          <p className="mt-1 text-[13px] text-[#6B6B6B]">
            Set up your project and let PM Agent start analyzing
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Basic Information Card */}
          <div className="rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[#C67A52]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="text-sm font-medium text-[#2C2C2C]">
                Basic Information
              </span>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#2C2C2C]">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Project Alpha"
                  required
                  className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-3 text-[13px] placeholder:text-[#9A9A9A] focus:border-[#C67A52] focus:outline-none focus:ring-1 focus:ring-[#C67A52]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#2C2C2C]">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Briefly describe what this project is about..."
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-3 text-[13px] placeholder:text-[#9A9A9A] focus:border-[#C67A52] focus:outline-none focus:ring-1 focus:ring-[#C67A52]"
                />
              </div>
            </div>
          </div>

          {/* Initial Ideas Card */}
          <div className="rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[#C67A52]"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
                <span className="text-sm font-medium text-[#2C2C2C]">
                  Initial Ideas
                </span>
              </div>
              <span className="text-[11px] text-[#9A9A9A]">Optional</span>
            </div>

            <p className="mb-4 text-xs text-[#6B6B6B]">
              Share any initial thoughts or requirements for PM Agent to
              consider when generating proposals
            </p>

            <div className="space-y-3">
              {ideas.map((idea, index) => (
                <div key={index} className="relative">
                  <textarea
                    value={idea}
                    onChange={(e) => handleIdeaChange(index, e.target.value)}
                    placeholder="e.g., We need user authentication with OAuth support..."
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-3 pr-10 text-[13px] placeholder:text-[#9A9A9A] focus:border-[#C67A52] focus:outline-none focus:ring-1 focus:ring-[#C67A52]"
                  />
                  {ideas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIdea(index)}
                      className="absolute right-3 top-3 text-[#9A9A9A] hover:text-[#6B6B6B]"
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
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddIdea}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#E5E0D8] px-3 py-2 text-xs text-[#6B6B6B] hover:bg-[#F5F2EC]"
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
              Add another idea
            </button>
          </div>

          {/* Documents Card */}
          <div className="rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[#C67A52]"
                >
                  <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="text-sm font-medium text-[#2C2C2C]">
                  Documents
                </span>
              </div>
              <span className="text-[11px] text-[#9A9A9A]">Optional</span>
            </div>

            <p className="mb-4 text-xs text-[#6B6B6B]">
              Upload PRD, technical design, or any reference documents for PM
              Agent to analyze
            </p>

            {/* Upload Area */}
            <div
              className={`flex h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${
                dragActive
                  ? "border-[#C67A52] bg-[#FFF8F5]"
                  : "border-[#E5E0D8] bg-[#FAF8F4]"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.md,.doc,.docx,.txt"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-[#9A9A9A]"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs text-[#6B6B6B]">
                Drag & drop files here, or click to browse
              </span>
              <span className="text-[11px] text-[#9A9A9A]">
                PDF, Markdown, Word documents up to 10MB
              </span>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-[#FAF8F4] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-[#C67A52]"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="text-[13px] text-[#2C2C2C]">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#9A9A9A]">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-[#9A9A9A] hover:text-[#6B6B6B]"
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
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 py-2">
            <Link href="/projects">
              <button
                type="button"
                className="rounded-lg border border-[#E5E0D8] px-5 py-2.5 text-[13px] font-medium text-[#2C2C2C] hover:bg-[#F5F2EC]"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C67A52] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#B56A42] disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
              {loading ? "Creating..." : "Create & Start PM Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
