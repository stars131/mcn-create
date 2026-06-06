import { addDays, format, startOfWeek } from "date-fns";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { listCalendarItems } from "@/server/services/calendar-service";

export default function CalendarPage() {
  const workspaceId = getCurrentWorkspaceId();
  const items = listCalendarItems(workspaceId);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <>
      <PageHeading
        eyebrow="Content Calendar"
        title="内容日历"
        description="MVP 使用按钮排期，保留拖拽排期结构；按平台、状态、负责人查看发布计划。"
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>周视图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((day) => {
                const dayItems = items.filter(
                  (item) => format(new Date(item.scheduledAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                );
                return (
                  <div key={day.toISOString()} className="min-h-[220px] rounded-md border border-border bg-white p-3">
                    <div className="text-xs font-semibold text-muted-foreground">{format(day, "MM-dd")}</div>
                    <div className="mt-3 space-y-2">
                      {dayItems.map((item) => (
                        <div key={item.id} className="rounded-md border border-cyan-100 bg-cyan-50 p-2">
                          <div className="text-xs font-medium leading-5">{item.title}</div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Badge tone="info">{platformLabels[item.platform]}</Badge>
                            <span className="text-xs text-muted-foreground">{item.ownerName}</span>
                          </div>
                        </div>
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
            {items.map((item) => (
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
          </CardContent>
        </Card>
      </section>
    </>
  );
}
