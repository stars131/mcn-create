import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { importMetricData } from "@/server/services/analytics-service";

const recordSchema = z.object({
  title: z.string().min(1),
  platform: z.string().min(1),
  views: z.coerce.number().int().nonnegative(),
  likes: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative(),
  conversions: z.coerce.number().int().nonnegative(),
  publishedAt: z.string().optional()
});

const schema = z.object({
  records: z.array(recordSchema).min(1).optional(),
  rawText: z.string().optional(),
  fileContent: z.string().optional(),
  fileType: z.enum(["RECORDS", "JSON", "CSV", "TSV", "EXCEL"]).optional(),
  fileName: z.string().optional()
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(importMetricData({ workspaceId, userId: user.id, importPayload: input }));
});
