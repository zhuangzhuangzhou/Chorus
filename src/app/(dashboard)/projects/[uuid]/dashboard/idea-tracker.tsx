"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdeaTrackerList } from "./idea-tracker-list";
import { NewIdeaDialog } from "./new-idea-dialog";

interface IdeaTrackerProps {
  projectUuid: string;
  currentUserUuid: string;
}

export function IdeaTracker({ projectUuid, currentUserUuid }: IdeaTrackerProps) {
  const t = useTranslations("ideaTracker");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);

  // Suppress unused variable warning — currentUserUuid will be used when detail panel is added
  void currentUserUuid;

  const handleIdeaCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with New Idea button — hidden when empty (CTA is in empty state) */}
      {!isEmpty && (
        <div className="mb-4 flex items-center justify-end">
          <Button
            onClick={() => setShowNewIdeaDialog(true)}
            size="sm"
            className="gap-1.5 rounded-md bg-[#C67A52] px-3.5 py-2 text-white hover:bg-[#B56A42]"
          >
            <Plus className="h-4 w-4" />
            {t("actions.newIdea")}
          </Button>
        </div>
      )}

      {/* Ideas List */}
      <IdeaTrackerList
        key={refreshKey}
        projectUuid={projectUuid}
        onNewIdea={() => setShowNewIdeaDialog(true)}
        onEmptyChange={setIsEmpty}
      />

      {/* New Idea Dialog */}
      <NewIdeaDialog
        open={showNewIdeaDialog}
        onOpenChange={setShowNewIdeaDialog}
        projectUuid={projectUuid}
        onCreated={handleIdeaCreated}
      />
    </div>
  );
}
