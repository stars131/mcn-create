"use client";

import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

interface ContentScheduleFormProps {
  contentDraftId: string;
  initialPlatform: Platform;
}

const publishPlatforms: Platform[] = ["XIAOHONGSHU", "DOUYIN", "WECHAT", "BILIBILI", "VIDEO_ACCOUNT"];

function datetimeLocalValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

export function ContentScheduleForm({ contentDraftId, initialPlatform }: ContentScheduleFormProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(
    publishPlatforms.includes(initialPlatform) ? initialPlatform : "XIAOHONGSHU"
  );
  const [scheduledAt, setScheduledAt] = useState(() => datetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function scheduleContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        throw new Error("发布时间无效");
      }

      const response = await fetch(`/api/contents/${contentDraftId}/schedule`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform,
          scheduledAt: scheduledDate.toISOString()
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "加入日历失败");
      }

      setMessage("已加入日历");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加入日历失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rounded-md border border-border bg-muted/50 p-3" onSubmit={scheduleContent}>
      <div className="grid gap-3 md:grid-cols-[150px_1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-schedule-platform">
            发布平台
          </label>
          <select
            id="content-schedule-platform"
            className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
          >
            {publishPlatforms.map((item) => (
              <option key={item} value={item}>
                {platformLabels[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-schedule-time">
            发布时间
          </label>
          <input
            id="content-schedule-time"
            className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {pending ? "排期中" : "加入日历"}
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
