"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Upload, X, FileText, Loader2 } from "lucide-react";
import { createIdeaAction } from "./actions";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

interface IdeaCreateFormProps {
  projectUuid: string;
}

export function IdeaCreateForm({ projectUuid }: IdeaCreateFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          type: file.type || "application/octet-stream",
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

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    startTransition(async () => {
      try {
        // Process uploaded files into attachments
        const attachments: { type: string; name: string; url: string; content?: string }[] = [];

        for (const uploadedFile of uploadedFiles) {
          // For .md files, read the content
          if (uploadedFile.name.toLowerCase().endsWith(".md")) {
            const fileContent = await uploadedFile.file.text();
            attachments.push({
              type: "markdown",
              name: uploadedFile.name,
              url: `file://${uploadedFile.name}`, // placeholder URL for now
              content: fileContent,
            });
          } else {
            // For other files, just store metadata (file upload to storage would be implemented later)
            attachments.push({
              type: uploadedFile.type,
              name: uploadedFile.name,
              url: `file://${uploadedFile.name}`, // placeholder URL for now
            });
          }
        }

        const result = await createIdeaAction({
          projectUuid,
          title: title.trim(),
          content: content.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        if (result.success) {
          setOpen(false);
          setTitle("");
          setContent("");
          setUploadedFiles([]);
          router.refresh();
        } else {
          setError(result.error || "Failed to create idea");
        }
      } catch {
        setError("An error occurred. Please try again.");
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setTitle("");
    setContent("");
    setUploadedFiles([]);
    setError(null);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t("ideas.newIdea")}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("ideas.newIdea")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">{t("ideas.whatIsYourIdea")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("ideas.whatIsYourIdea")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">{t("common.description")}</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("ideas.addMoreDetails")}
                rows={4}
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <Label>{t("projects.createNew.documents")}</Label>
              <div
                className={`flex h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary/50"
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
                  accept=".md,.txt,.png,.jpg,.jpeg,.gif,.pdf"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("projects.createNew.dragDrop")}
                </span>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          className="h-6 w-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.creating")}
                  </>
                ) : (
                  t("common.create")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
