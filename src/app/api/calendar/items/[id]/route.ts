import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { updateCalendarItem } from "@/server/services/calendar-service";

const schema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["PLANNED", "READY", "EXPORTED", "PUBLISHED", "FAILED"]).optional()
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(updateCalendarItem({ workspaceId, userId: user.id, id: params.id, patch: input }));
});
