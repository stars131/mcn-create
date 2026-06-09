"use client";

import { addDays, format } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublishStatus } from "@/types/domain";

interface CalendarItemActionsProps {
  itemId: string;
  scheduledAt: string;
  status: PublishStatus;
}

export function CalendarItemActions({ itemId, scheduledAt, status }: CalendarItemActionsProps) {
  const router = useRouter();
  const [currentScheduledAt, setCurrentScheduledAt] = useState(scheduledAt);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pendingAction, setPendingAction] = useState<"previous" | "next" | "publish" | null>(null);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setCurrentScheduledAt(scheduledAt);
    setCurrentStatus(status);
  }, [scheduledAt, status]);

  async function patchCalendarItem(input: {
    action: "previous" | "next" | "publish";
    body: { scheduledAt?: string; status?: PublishStatus };
    successMessage: string;
  }) {
    setPendingAction(input.action);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/calendar/items/${itemId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input.body)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "发布计划调整失败");
      }

      setCurrentScheduledAt(payload?.data?.scheduledAt ?? input.body.scheduledAt ?? currentScheduledAt);
      setCurrentStatus(payload?.data?.status ?? input.body.status ?? currentStatus);
      setMessage(input.successMessage);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布计划调整失败");
    } finally {
      setPendingAction(null);
    }
  }

  function shiftSchedule(days: number) {
    const nextScheduledAt = addDays(new Date(currentScheduledAt), days).toISOString();
    void patchCalendarItem({
      action: days < 0 ? "previous" : "next",
      body: { scheduledAt: nextScheduledAt },
      successMessage: days < 0 ? "发布计划已提前一天" : "发布计划已顺延一天"
    });
  }

  return (
    <div className="space-y-2" role="group" aria-label="发布计划调整">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => shiftSchedule(-1)}
          disabled={pendingAction !== null}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "previous" ? "调整中" : "提前一天"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => shiftSchedule(1)}
          disabled={pendingAction !== null}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "next" ? "调整中" : "顺延一天"}
        </Button>
        {currentStatus !== "PUBLISHED" ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() =>
              void patchCalendarItem({
                action: "publish",
                body: { status: "PUBLISHED" },
                successMessage: "发布计划已标记发布"
              })
            }
            disabled={pendingAction !== null}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {pendingAction === "publish" ? "发布中" : "标记发布"}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>当前排期 {format(new Date(currentScheduledAt), "MM-dd HH:mm")}</span>
        {message ? (
          <span role="status" aria-live="polite">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
