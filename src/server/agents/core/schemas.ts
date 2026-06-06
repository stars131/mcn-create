import { z } from "zod";

export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
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

export const hotspotAgentInputSchema = z.object({
  keyword: z.string().optional(),
  industry: z.string().optional(),
  competitorAccounts: z.array(z.string()).default([]),
  platforms: z.array(platformSchema).default(["ALL"]),
  window: z.enum(["24h", "7d", "30d"]).default("24h")
});

export const hotspotAgentOutputSchema = z.object({
  clusters: z.array(
    z.object({
      name: z.string(),
      summary: z.string(),
      trendReason: z.string(),
      heatScore: z.number(),
      growthScore: z.number(),
      riskLevel: riskLevelSchema,
      suggestedAngles: z.array(z.string())
    })
  ),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      platform: platformSchema,
      heatScore: z.number(),
      growthScore: z.number(),
      riskLevel: riskLevelSchema,
      suggestedAngles: z.array(z.string())
    })
  )
});

export const topicAgentInputSchema = z.object({
  hotItemId: z.string(),
  personaId: z.string().default("persona_001"),
  businessGoal: z.string().default("获取内容工作流线索"),
  forbiddenTopics: z.array(z.string()).default([]),
  targetPlatforms: z.array(platformSchema).default(["XIAOHONGSHU", "DOUYIN"])
});

export const topicAgentOutputSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string(),
      angle: z.string(),
      audience: z.string(),
      targetPlatforms: z.array(platformSchema),
      score: z.number(),
      riskLevel: riskLevelSchema,
      outline: z.array(z.string())
    })
  )
});

export const personaAgentInputSchema = z.object({
  personaId: z.string().default("persona_001"),
  importedContent: z.string().min(1),
  brandNotes: z.string().default("")
});

export const personaAgentOutputSchema = z.object({
  voiceGuide: z.string(),
  forbiddenExpressions: z.array(z.string()),
  highFrequencyWords: z.array(z.string()),
  structurePreferences: z.array(z.string()),
  audiencePortraits: z.array(z.string()),
  versionSummary: z.string()
});

export const contentAgentInputSchema = z.object({
  topicId: z.string(),
  personaId: z.string().default("persona_001"),
  platform: platformSchema.default("XIAOHONGSHU"),
  format: z.string().default("图文"),
  cta: z.string().default("引导读者领取工作流清单")
});

export const contentAgentOutputSchema = z.object({
  title: z.string(),
  platform: platformSchema,
  format: z.string(),
  content: z.string(),
  suggestions: z.array(z.string()),
  riskCheckRequired: z.boolean()
});

export const riskAgentInputSchema = z.object({
  contentDraftId: z.string().optional(),
  content: z.string().min(1)
});

export const riskAgentOutputSchema = z.object({
  riskLevel: riskLevelSchema,
  riskItems: z.array(z.string()),
  rewriteSuggestions: z.array(z.string())
});

export const analyticsAgentInputSchema = z.object({
  metricIds: z.array(z.string()).default([]),
  period: z.string().default("本周"),
  commentSummary: z.string().default("评论集中关注内容工作流落地和人设一致性。")
});

export const analyticsAgentOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  anomalies: z.array(z.string()),
  recommendations: z.array(z.string()),
  hypotheses: z.array(z.string())
});
