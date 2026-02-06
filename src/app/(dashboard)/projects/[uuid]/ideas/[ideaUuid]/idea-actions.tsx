"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AssignModal } from "@/components/assign-modal";
import { UserPlus } from "lucide-react";
import { claimIdeaAction, claimIdeaToAgentAction, claimIdeaToUserAction, getPmAgentsAction } from "./actions";

interface Agent {
  uuid: string;
  name: string;
  roles: string[];
  ownerUuid?: string | null;
}

interface CompanyUser {
  uuid: string;
  name: string | null;
  email: string | null;
}

interface IdeaActionsProps {
  ideaUuid: string;
  projectUuid: string;
  status: string;
  currentUserUuid?: string;
}

export function IdeaActions({ ideaUuid, status, currentUserUuid }: IdeaActionsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);

  useEffect(() => {
    // Load PM agents and users when modal opens
    if (showAssignModal) {
      getPmAgentsAction().then(({ agents, users }) => {
        setAgents(agents);
        setUsers(users);
      });
    }
  }, [showAssignModal]);

  const handleAssignToSelf = async () => {
    return claimIdeaAction(ideaUuid);
  };

  const handleAssignToAgent = async (agentUuid: string) => {
    return claimIdeaToAgentAction(ideaUuid, agentUuid);
  };

  const handleAssignToUser = async (userUuid: string) => {
    return claimIdeaToUserAction(ideaUuid, userUuid);
  };

  return (
    <div className="flex gap-2">
      {status === "open" && (
        <>
          <Button
            onClick={() => setShowAssignModal(true)}
            className="bg-[#C67A52] hover:bg-[#B56A42] text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t("common.assign")}
          </Button>
          <AssignModal
            open={showAssignModal}
            onOpenChange={setShowAssignModal}
            title={t("ideas.assignIdea")}
            agents={agents}
            users={users}
            currentUserUuid={currentUserUuid}
            onAssignToSelf={handleAssignToSelf}
            onAssignToAgent={handleAssignToAgent}
            onAssignToUser={handleAssignToUser}
          />
        </>
      )}
      <Button
        variant="outline"
        className="border-[#E5E0D8] text-[#6B6B6B]"
        onClick={() => router.back()}
      >
        {t("common.back")}
      </Button>
    </div>
  );
}
