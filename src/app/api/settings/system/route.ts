import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { listSystemSettings, upsertSystemSetting } from "@/server/services/settings-service";

const schema = z.object({
  key: z.string().min(1),
  value: z.unknown()
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(listSystemSettings(workspaceId));
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(upsertSystemSetting({ workspaceId, userId: user.id, key: input.key, value: input.value }));
});
