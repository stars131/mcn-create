"use client";

import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

const publishPlatforms: Platform[] = ["XIAOHONGSHU", "DOUYIN", "WECHAT", "BILIBILI", "VIDEO_ACCOUNT"];

function datetimeLocalValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

export function CalendarItemCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("XIAOHONGSHU");
  const [scheduledAt, setScheduledAt] = useState(() => datetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [ownerName, setOwnerName] = useState("林澈");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function createCalendarItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        throw new Error("发布时间无效");
      }

      const response = await fetch("/api/calendar/items", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          platform,
          scheduledAt: scheduledDate.toISOString(),
          ownerName
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "发布计划创建失败");
      }

      setTitle("");
      setMessage("发布计划已创建");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布计划创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={createCalendarItem}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_220px_120px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="calendar-item-title">
            日程标题
          </label>
          <input
            id="calendar-item-title"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="calendar-item-platform">
            发布平台
          </label>
          <select
            id="calendar-item-platform"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="calendar-item-time">
            发布时间
          </label>
          <input
            id="calendar-item-time"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="calendar-item-owner">
            负责人
          </label>
          <input
            id="calendar-item-owner"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {pending ? "创建中" : "新增发布计划"}
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
