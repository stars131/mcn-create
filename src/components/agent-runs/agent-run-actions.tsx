"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentStatus } from "@/types/domain";

type RunAction = "retry" | "feedback";

type ApiPayload = {
  error?: string;
};

interface AgentRunActionsProps {
  runId: string;
  status: AgentStatus;
  stepCount: number;
  outputCount: number;
  feedbackCount: number;
}

export function AgentRunActions({
  runId,
  status,
  stepCount,
  outputCount,
  feedbackCount
}: AgentRunActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<RunAction | null>(null);
  const [message, setMessage] = useState<string>();
  const [currentFeedbackCount, setCurrentFeedbackCount] = useState(feedbackCount);
  const retryDisabled = status === "PENDING" || status === "RUNNING";

  useEffect(() => {
    setCurrentFeedbackCount(feedbackCount);
  }, [feedbackCount]);

  async function runAction(action: RunAction) {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(
        action === "retry" ? `/api/agent-runs/${runId}/retry` : `/api/agent-runs/${runId}/feedback`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: action === "feedback" ? JSON.stringify({ rating: 5, comment: "页面快捷反馈：结果可用" }) : undefined
        }
      );
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Agent 操作失败");
      }

      if (action === "retry") {
        setMessage("Agent 已重跑");
      } else {
        setCurrentFeedbackCount((count) => count + 1);
        setMessage("反馈已提交");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Agent 操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`Agent 操作：${runId}`}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction("retry")}
          disabled={pendingAction !== null || retryDisabled}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "retry" ? "重跑中" : "重跑"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction("feedback")}
          disabled={pendingAction !== null}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "feedback" ? "提交中" : "好评"}
        </Button>
      </div>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        <Badge>{stepCount} 步</Badge>
        <Badge>{outputCount} 输出</Badge>
        <Badge>{currentFeedbackCount} 反馈</Badge>
      </div>
    </div>
  );
}
