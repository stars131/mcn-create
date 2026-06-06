import { z } from "zod";

export const workspaceQuerySchema = z.object({
  workspaceId: z.string().min(1).default("ws_demo")
});

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const platformSchema = z.enum([
  "ALL",
  "DOUYIN",
  "XIAOHONGSHU",
  "BILIBILI",
  "WECHAT",
  "WEIBO",
  "KUAISHOU",
  "VIDEO_ACCOUNT",
  "OTHER"
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});
