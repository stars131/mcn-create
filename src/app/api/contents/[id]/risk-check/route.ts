import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { riskCheckContent } from "@/server/services/content-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await riskCheckContent({ workspaceId, userId: user.id, id: params.id }));
}
