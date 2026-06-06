import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { inviteMember, listMembers } from "@/server/services/workspace-service";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"]).default("VIEWER"),
  title: z.string().optional()
});

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  getRequestContext(request, { workspaceId: params.id });
  return ok(listMembers(params.id));
});

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user } = getRequestContext(request, { workspaceId: params.id, permission: "member.manage" });
  const input = await readJson(request, inviteSchema);
  return ok(inviteMember({ workspaceId: params.id, userId: user.id, ...input }));
});
