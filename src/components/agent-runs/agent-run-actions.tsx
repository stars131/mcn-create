"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentStatus } from "@/types/domain";

type RunAction = "retry" | "feedback";

type ApiPayload = {
  error?: string;
};

type ApiPayloadWithData<T> = ApiPayload & {
  data?: T;
};

type AgentRunDetailSnapshot = {
  run: {
    status: AgentStatus;
  };
  steps: unknown[];
  outputs: unknown[];
  feedback: unknown[];
};

interface AgentRunActionsProps {
  runId: string;
  status: AgentStatus;
  stepCount: number;
  outputCount: number;
  feedbackCount: number;
}

async function fetchAgentRunDetailSnapshot(runId: string): Promise<AgentRunDetailSnapshot> {
  const response = await fetch(`/api/agent-runs/${runId}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" }
  });
  const payload = (await response.json().catch(() => null)) as ApiPayloadWithData<AgentRunDetailSnapshot> | null;
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error ?? "Agent 状态读取失败");
  }
  return payload.data;
}

export function AgentRunActions({
  runId,
  status,
  stepCount,
  outputCount,
  feedbackCount
}: AgentRunActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<RunAction | null>(null);
  const [message, setMessage] = useState<string>();
  const [currentFeedbackCount, setCurrentFeedbackCount] = useState(feedbackCount);
  const detailQuery = useQuery<AgentRunDetailSnapshot>({
    queryKey: ["agent-run-detail", runId],
    queryFn: () => fetchAgentRunDetailSnapshot(runId),
    placeholderData: {
      run: { status },
      steps: Array.from({ length: stepCount }),
      outputs: Array.from({ length: outputCount }),
      feedback: Array.from({ length: feedbackCount })
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.run.status;
      return currentStatus === "PENDING" || currentStatus === "RUNNING" ? 3000 : false;
    }
  });
  const currentStatus = detailQuery.data?.run.status ?? status;
  const currentStepCount = detailQuery.data?.steps.length ?? stepCount;
  const currentOutputCount = detailQuery.data?.outputs.length ?? outputCount;
  const detailFeedbackCount = detailQuery.data?.feedback.length ?? feedbackCount;
  const retryDisabled = currentStatus === "PENDING" || currentStatus === "RUNNING";

  useEffect(() => {
    setCurrentFeedbackCount(detailFeedbackCount);
  }, [detailFeedbackCount]);

  async function refreshSnapshot() {
    setMessage(undefined);
    try {
      await detailQuery.refetch();
      setMessage("状态已刷新");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Agent 状态读取失败");
    }
  }

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
      await queryClient.invalidateQueries({ queryKey: ["agent-run-detail", runId] });
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void refreshSnapshot()}
          disabled={pendingAction !== null || detailQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {detailQuery.isFetching ? "刷新中" : "刷新状态"}
        </Button>
      </div>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        <Badge>{currentStatus.toLowerCase()}</Badge>
        <Badge>{currentStepCount} 步</Badge>
        <Badge>{currentOutputCount} 输出</Badge>
        <Badge>{currentFeedbackCount} 反馈</Badge>
      </div>
    </div>
  );
}
