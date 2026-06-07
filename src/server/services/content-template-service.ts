import { nextId, store } from "@/server/services/mock-store";
import type { ContentBlock, ContentDraft, ContentTemplate, MediaAsset, Platform } from "@/types/domain";

function nonEmptyParts(content: string) {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripLabel(part: string) {
  return part.replace(/^[^：:]{1,12}[：:]\s*/, "").trim();
}

function findPart(parts: string[], labels: string[]) {
  const found = parts.find((part) => labels.some((label) => part.startsWith(label)));
  return found ? stripLabel(found) : undefined;
}

function bodyForBlock(type: string, content: string, fallbackIndex: number) {
  const parts = nonEmptyParts(content);
  const fallback = stripLabel(parts[fallbackIndex] ?? parts[parts.length - 1] ?? content);

  if (["hook", "opening", "intro"].includes(type)) {
    return findPart(parts, ["选题", "开场", "标题"]) ?? fallback;
  }
  if (type === "persona") {
    return findPart(parts, ["人设语气", "人设"]) ?? fallback;
  }
  if (["brief", "scene", "analysis"].includes(type)) {
    return findPart(parts, ["核心 brief", "brief", "场景"]) ?? fallback;
  }
  if (["body", "workflow", "talking_points", "chapters", "points"].includes(type)) {
    return findPart(parts, ["正文", "平台适配", "流程"]) ?? fallback;
  }
  if (type === "risk_note") {
    return "发布前补充事实来源与版权说明，并保留风险检查记录。";
  }
  if (["cta", "conclusion"].includes(type)) {
    return findPart(parts, ["CTA", "结尾"]) ?? fallback;
  }
  return fallback;
}

export function listContentTemplates(workspaceId: string, platform?: Platform) {
  return store.contentTemplates
    .filter((template) => template.workspaceId === workspaceId && (!platform || template.platform === platform))
    .sort((a, b) => a.platform.localeCompare(b.platform) || a.format.localeCompare(b.format));
}

export function findContentTemplate(input: { workspaceId: string; platform: Platform; format?: string }) {
  const candidates = listContentTemplates(input.workspaceId, input.platform);
  return (
    candidates.find((template) => template.format === input.format) ??
    candidates[0] ??
    store.contentTemplates.find((template) => template.workspaceId === input.workspaceId && template.platform === "XIAOHONGSHU")
  );
}

export function listContentBlocks(workspaceId: string, contentDraftId: string) {
  return store.contentBlocks
    .filter((block) => block.workspaceId === workspaceId && block.contentDraftId === contentDraftId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listMediaAssets(workspaceId: string, contentDraftId?: string) {
  return store.mediaAssets
    .filter((asset) => asset.workspaceId === workspaceId && (!contentDraftId || asset.contentDraftId === contentDraftId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function recordContentBlocks(input: {
  content: ContentDraft;
  template?: ContentTemplate;
  replaceExisting?: boolean;
}): ContentBlock[] {
  if (input.replaceExisting) {
    store.contentBlocks = store.contentBlocks.filter((block) => block.contentDraftId !== input.content.id);
  }

  const template = input.template ?? findContentTemplate({
    workspaceId: input.content.workspaceId,
    platform: input.content.platform,
    format: input.content.format
  });
  const schemaBlocks = template?.schema.blocks ?? [
    { type: "body", label: "正文", required: true }
  ];
  const now = new Date().toISOString();
  const blocks = schemaBlocks.map((schemaBlock, index) => ({
    id: nextId("content_block"),
    workspaceId: input.content.workspaceId,
    contentDraftId: input.content.id,
    type: schemaBlock.type,
    sortOrder: index + 1,
    body: bodyForBlock(schemaBlock.type, input.content.content, index),
    metadata: {
      templateId: template?.id,
      templateName: template?.name,
      label: schemaBlock.label,
      required: schemaBlock.required ?? false
    },
    createdAt: now,
    updatedAt: now
  }));

  store.contentBlocks.unshift(...blocks);
  return blocks;
}

export function recordGeneratedMediaAsset(input: {
  content: ContentDraft;
  template?: ContentTemplate;
}): MediaAsset {
  const now = new Date().toISOString();
  const asset: MediaAsset = {
    id: nextId("media"),
    workspaceId: input.content.workspaceId,
    contentDraftId: input.content.id,
    name: `${input.content.title} 封面提示`,
    assetType: "cover_prompt",
    url: `mock://assets/${input.content.id}/cover-prompt`,
    sourceType: "MOCK",
    metadata: {
      templateId: input.template?.id,
      platform: input.content.platform,
      prompt: "围绕内容工作流、人设记忆、审核和复盘生成克制的封面视觉。"
    },
    createdAt: now,
    updatedAt: now
  };
  store.mediaAssets.unshift(asset);
  return asset;
}
