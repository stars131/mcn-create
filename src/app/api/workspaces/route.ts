import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { createWorkspace, listWorkspaces } from "@/server/services/workspace-service";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().optional()
});

export async function GET() {
  return ok(listWorkspaces());
}

export async function POST(request: NextRequest) {
  const { user } = getRequestContext(request);
  const input = await readJson(request, createSchema);
  return ok(createWorkspace({ ...input, userId: user.id }));
}
