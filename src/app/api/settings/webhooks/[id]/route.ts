import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { updateWebhookEndpoint } from "@/server/services/settings-service";

const updateSchema = z.object({
  enabled: z.boolean().optional()
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  const input = await readJson(request, updateSchema);
  return ok(updateWebhookEndpoint({ workspaceId, userId: user.id, id: params.id, ...input }));
});
