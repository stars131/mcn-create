import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { importPersonaContent } from "@/server/services/persona-service";

const schema = z.object({
  importedContent: z.string().min(1),
  brandNotes: z.string().optional()
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(
    await importPersonaContent({
      workspaceId,
      userId: user.id,
      personaId: params.id,
      importedContent: input.importedContent,
      brandNotes: input.brandNotes
    })
  );
}
