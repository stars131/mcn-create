import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { store } from "@/server/services/mock-store";

const schema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["PLANNED", "READY", "EXPORTED", "PUBLISHED", "FAILED"]).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  const item = store.calendarItems.find((record) => record.workspaceId === workspaceId && record.id === params.id);
  if (!item) {
    return Response.json({ error: "日历项不存在" }, { status: 404 });
  }
  Object.assign(item, input);
  return ok(item);
}
