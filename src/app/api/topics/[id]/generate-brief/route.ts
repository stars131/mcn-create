import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { generateBrief } from "@/server/services/topic-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  return ok(generateBrief({ workspaceId, userId: user.id, topicId: params.id }));
}
