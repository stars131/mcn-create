import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { generateTopicsFromHotspot } from "@/server/services/topic-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await generateTopicsFromHotspot({ workspaceId, userId: user.id, hotItemId: params.id }));
}
