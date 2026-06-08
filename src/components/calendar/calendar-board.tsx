"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformLabels } from "@/lib/constants/navigation";
import type { CalendarItem, Platform } from "@/types/domain";

type CalendarMode = "week" | "month";

const filterPlatforms: Platform[] = [
  "ALL",
  "DOUYIN",
  "XIAOHONGSHU",
  "BILIBILI",
  "WECHAT",
  "WEIBO",
  "KUAISHOU",
  "VIDEO_ACCOUNT",
  "OTHER"
];

function getCalendarDays(mode: CalendarMode, referenceDate: Date) {
  if (mode === "month") {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    });
  }

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function CalendarItemCard({ item }: { item: CalendarItem }) {
  return (
    <div className="rounded-md border border-cyan-100 bg-cyan-50 p-2">
      <div className="text-xs font-medium leading-5">{item.title}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge tone="info">{platformLabels[item.platform]}</Badge>
        <span className="text-xs text-muted-foreground">{item.ownerName}</span>
      </div>
    </div>
  );
}

export function CalendarBoard({ items, referenceDate }: { items: CalendarItem[]; referenceDate: string }) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [platform, setPlatform] = useState<Platform>("ALL");
  const activeDate = useMemo(() => new Date(referenceDate), [referenceDate]);
  const days = useMemo(() => getCalendarDays(mode, activeDate), [mode, activeDate]);
  const filteredItems = useMemo(
    () => items.filter((item) => platform === "ALL" || item.platform === platform),
    [items, platform]
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>{mode === "week" ? "周视图" : "月视图"}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border bg-surface p-0.5" aria-label="日历视图">
              <Button
                type="button"
                size="sm"
                variant={mode === "week" ? "primary" : "ghost"}
                onClick={() => setMode("week")}
              >
                周视图
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "month" ? "primary" : "ghost"}
                onClick={() => setMode("month")}
              >
                月视图
              </Button>
            </div>
            <label className="sr-only" htmlFor="calendar-platform-filter">
              按平台筛选
            </label>
            <select
              id="calendar-platform-filter"
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
              value={platform}
              onChange={(event) => setPlatform(event.target.value as Platform)}
            >
              {filterPlatforms.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "全部平台" : platformLabels[item]}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            {days.map((day) => {
              const dayItems = filteredItems.filter((item) => isSameDay(new Date(item.scheduledAt), day));

              return (
                <div
                  key={day.toISOString()}
                  className={mode === "week" ? "min-h-[220px] rounded-md border border-border bg-white p-3" : "min-h-[150px] rounded-md border border-border bg-white p-3"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-muted-foreground">{format(day, "MM-dd")}</div>
                    <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {dayItems.map((item) => (
                      <CalendarItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>发布计划</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium leading-5">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {platformLabels[item.platform]} · {format(new Date(item.scheduledAt), "MM-dd HH:mm")}
                  </div>
                </div>
                <Badge>{item.status}</Badge>
              </div>
              <div className="mt-3">
                <ActionButton
                  endpoint={`/api/calendar/items/${item.id}`}
                  method="PATCH"
                  body={{ scheduledAt: addDays(new Date(item.scheduledAt), 1).toISOString() }}
                  label="顺延一天"
                  pendingLabel="调整中"
                  icon="chevronRight"
                />
              </div>
            </div>
          ))}
          {filteredItems.length === 0 ? <p className="text-sm text-muted-foreground">当前筛选下暂无发布计划。</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}
