"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ContentGovernanceActionsProps {
  contentDraftId: string;
}

export function ContentGovernanceActions({ contentDraftId }: ContentGovernanceActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"risk" | "review" | null>(null);
  const [message, setMessage] = useState<string>();

  async function runAction(action: "risk" | "review") {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(
        action === "risk" ? `/api/contents/${contentDraftId}/risk-check` : `/api/contents/${contentDraftId}/review`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body:
            action === "review"
              ? JSON.stringify({ status: "APPROVED", comment: "MVP 人工审核通过" })
              : undefined
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "内容治理操作失败");
      }

      setMessage(action === "risk" ? "风险检查已完成" : "内容已审核通过");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "内容治理操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="内容治理操作">
      <Button
        type="button"
        size="sm"
        variant="primary"
        onClick={() => void runAction("risk")}
        disabled={pendingAction !== null}
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        {pendingAction === "risk" ? "检查中" : "风险检查"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => void runAction("review")}
        disabled={pendingAction !== null}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {pendingAction === "review" ? "提交中" : "审核通过"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
