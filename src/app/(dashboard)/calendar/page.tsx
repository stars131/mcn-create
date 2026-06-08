import { CalendarBoard } from "@/components/calendar/calendar-board";
import { PageHeading } from "@/components/ui/page-heading";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { listCalendarItems } from "@/server/services/calendar-service";

export default function CalendarPage() {
  const workspaceId = getCurrentWorkspaceId();
  const items = listCalendarItems(workspaceId);
  const referenceDate = new Date().toISOString();

  return (
    <>
      <PageHeading
        eyebrow="Content Calendar"
        title="内容日历"
        description="MVP 使用按钮排期，保留拖拽排期结构；按平台、状态、负责人查看发布计划。"
      />

      <CalendarBoard items={items} referenceDate={referenceDate} />
    </>
  );
}
