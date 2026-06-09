"use client";

import { RefreshCw, SendToBack } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type WorkflowAction = "report" | "backflow";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type AnalyticsReportPayload = {
  title?: string;
};

type TopicPayload = {
  id: string;
};

export function AnalyticsWorkflowActions() {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);
  const [message, setMessage] = useState<string>();

  async function runAction(action: WorkflowAction) {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(
        action === "report" ? "/api/analytics/reports/generate" : "/api/analytics/recommendations/to-topics",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: action === "report" ? JSON.stringify({ period: "本周" }) : undefined
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | ApiPayload<AnalyticsReportPayload | TopicPayload[]>
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "数据复盘操作失败");
      }

      if (action === "report") {
        const report = payload?.data as AnalyticsReportPayload | undefined;
        setMessage(report?.title ? `周报已生成：${report.title}` : "周报已生成");
      } else {
        const topics = Array.isArray(payload?.data) ? payload.data : [];
        setMessage(topics.length > 0 ? `已回流 ${topics.length} 条选题` : "暂无可回流选题");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数据复盘操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label="数据复盘工作流">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => void runAction("report")}
          disabled={pendingAction !== null}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "report" ? "生成中" : "生成周报"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction("backflow")}
          disabled={pendingAction !== null}
        >
          <SendToBack className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "backflow" ? "回流中" : "建议回流选题池"}
        </Button>
      </div>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
