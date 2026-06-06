import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { generateAnalyticsReport } from "@/server/services/analytics-service";

const schema = z.object({
  period: z.string().optional()
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(await generateAnalyticsReport({ workspaceId, userId: user.id, period: input.period }));
});
