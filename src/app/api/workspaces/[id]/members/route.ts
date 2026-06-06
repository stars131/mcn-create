import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { inviteMember, listMembers } from "@/server/services/workspace-service";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"]).default("VIEWER"),
  title: z.string().optional()
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return ok(listMembers(params.id));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user } = getRequestContext(request);
  const input = await readJson(request, inviteSchema);
  return ok(inviteMember({ workspaceId: params.id, userId: user.id, ...input }));
}
