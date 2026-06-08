"use client";

import { CheckCircle2, GitBranchPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PersonaProfile } from "@/types/domain";

interface PersonaVersionActionsProps {
  personaId: string;
  reviewStatus: PersonaProfile["reviewStatus"];
}

export function PersonaVersionActions({ personaId, reviewStatus }: PersonaVersionActionsProps) {
  const router = useRouter();
  const [currentReviewStatus, setCurrentReviewStatus] = useState(reviewStatus);
  const [pendingAction, setPendingAction] = useState<"generate" | "approve" | null>(null);
  const [message, setMessage] = useState<string>();

  async function runAction(action: "generate" | "approve") {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(
        action === "generate" ? `/api/personas/${personaId}/generate-version` : `/api/personas/${personaId}`,
        {
          method: action === "generate" ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: action === "generate" ? undefined : JSON.stringify({ reviewStatus: "APPROVED" })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "人设版本操作失败");
      }

      if (action === "generate") {
        setCurrentReviewStatus(payload?.data?.persona?.reviewStatus ?? "REVIEWING");
        setMessage("待审版本已创建");
      } else {
        setCurrentReviewStatus(payload?.data?.reviewStatus ?? "APPROVED");
        setMessage("人设版本已通过");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "人设版本操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => void runAction("generate")}
        disabled={pendingAction !== null}
      >
        <GitBranchPlus className="h-4 w-4" aria-hidden="true" />
        {pendingAction === "generate" ? "创建中" : "创建待审版本"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="primary"
        onClick={() => void runAction("approve")}
        disabled={pendingAction !== null || currentReviewStatus !== "REVIEWING"}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {pendingAction === "approve" ? "通过中" : "通过人设版本"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
