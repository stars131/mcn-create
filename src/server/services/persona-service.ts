import { PersonaAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type {
  BrandProfile,
  ForbiddenExpression,
  PersonaMemoryChunk,
  PersonaProfile,
  PersonaRule,
  PersonaVersion,
  PersonaVersionSnapshot,
  Platform,
  TargetAudience,
  ToneExample
} from "@/types/domain";

type BrandProfilePatch = Partial<Pick<BrandProfile, "name" | "industry" | "positioning" | "promise" | "metadata">>;

export function listPersonas(workspaceId: string) {
  return getWorkspaceScoped(store.personas, workspaceId);
}

export function listBrandProfiles(workspaceId: string) {
  return getWorkspaceScoped(store.brandProfiles, workspaceId)
    .filter((profile) => !profile.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getBrandProfile(workspaceId: string, id: string) {
  const profile = store.brandProfiles.find(
    (item) => item.workspaceId === workspaceId && item.id === id && !item.deletedAt
  );
  if (!profile) {
    throw new ApiError("品牌档案不存在", 404);
  }
  return profile;
}

export function getPersonaBrandProfile(persona: PersonaProfile) {
  if (!persona.brandProfileId) {
    return undefined;
  }
  return store.brandProfiles.find(
    (profile) => profile.workspaceId === persona.workspaceId && profile.id === persona.brandProfileId && !profile.deletedAt
  );
}

export function getPersona(workspaceId: string, id: string) {
  const persona = store.personas.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!persona) {
    throw new ApiError("人设不存在", 404);
  }
  return persona;
}

export function listPersonaMemoryChunks(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.personaMemoryChunks.filter((item) => item.workspaceId === workspaceId && item.personaId === personaId);
}

export function listPersonaRules(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.personaRules.filter((item) => item.workspaceId === workspaceId && item.personaId === personaId);
}

export function listForbiddenExpressions(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.forbiddenExpressions.filter(
    (item) => item.workspaceId === workspaceId && (!item.personaId || item.personaId === personaId)
  );
}

export function listToneExamples(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.toneExamples.filter((item) => item.workspaceId === workspaceId && item.personaId === personaId);
}

export function listTargetAudiences(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.targetAudiences.filter((item) => item.workspaceId === workspaceId && item.personaId === personaId);
}

export function getPersonaMemoryDetail(workspaceId: string, personaId: string) {
  const persona = getPersona(workspaceId, personaId);
  return {
    persona,
    brandProfile: getPersonaBrandProfile(persona),
    versions: listPersonaVersions(workspaceId, personaId),
    memoryChunks: listPersonaMemoryChunks(workspaceId, personaId),
    rules: listPersonaRules(workspaceId, personaId),
    forbiddenExpressions: listForbiddenExpressions(workspaceId, personaId),
    toneExamples: listToneExamples(workspaceId, personaId),
    targetAudiences: listTargetAudiences(workspaceId, personaId)
  };
}

const defaultAudienceChannels: Platform[] = ["XIAOHONGSHU", "WECHAT"];

function normalizeRequiredText(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ApiError(`${fieldName}不能为空`, 422);
  }
  return normalized;
}

function defaultBrandIndustry(name: string) {
  return name === "ContentOS" ? "中文内容运营与创作者工具" : "内容运营与品牌内容";
}

function defaultBrandPositioning(name: string) {
  return `${name} 的可审阅品牌记忆档案，用于约束人设、选题和内容生成。`;
}

function findBrandProfileByName(workspaceId: string, name: string) {
  const normalizedName = name.trim().toLowerCase();
  return store.brandProfiles.find(
    (profile) =>
      profile.workspaceId === workspaceId && !profile.deletedAt && profile.name.trim().toLowerCase() === normalizedName
  );
}

export function createBrandProfile(input: {
  workspaceId: string;
  userId: string;
  name: string;
  industry?: string;
  positioning?: string;
  promise?: string;
  metadata?: Record<string, unknown>;
}) {
  const name = normalizeRequiredText(input.name, "品牌名称");
  const now = new Date().toISOString();
  const profile: BrandProfile = {
    id: nextId("brand_profile"),
    workspaceId: input.workspaceId,
    name,
    industry: input.industry?.trim() || defaultBrandIndustry(name),
    positioning: input.positioning?.trim() || defaultBrandPositioning(name),
    promise: input.promise?.trim() || "保留人工审阅、合规来源和版本追踪，避免把内容系统包装成全自动代运营。",
    metadata: input.metadata ?? {
      sourceType: "USER_UPLOAD",
      createdFrom: "brand_profile.create"
    },
    createdAt: now,
    updatedAt: now
  };
  store.brandProfiles.unshift(profile);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "brand_profile.create",
    entityType: "BrandProfile",
    entityId: profile.id,
    summary: `创建品牌档案：${profile.name}`
  });
  return profile;
}

export function updateBrandProfile(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: BrandProfilePatch;
}) {
  const profile = getBrandProfile(input.workspaceId, input.id);
  if (input.patch.name !== undefined) {
    profile.name = normalizeRequiredText(input.patch.name, "品牌名称");
  }
  if (input.patch.industry !== undefined) {
    profile.industry = normalizeRequiredText(input.patch.industry, "行业");
  }
  if (input.patch.positioning !== undefined) {
    profile.positioning = normalizeRequiredText(input.patch.positioning, "定位");
  }
  if (input.patch.promise !== undefined) {
    profile.promise = input.patch.promise.trim() || undefined;
  }
  if (input.patch.metadata !== undefined) {
    profile.metadata = input.patch.metadata;
  }
  profile.updatedAt = new Date().toISOString();
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "brand_profile.update",
    entityType: "BrandProfile",
    entityId: profile.id,
    summary: `更新品牌档案：${profile.name}`
  });
  return profile;
}

function ensureBrandProfileForPersona(input: {
  workspaceId: string;
  userId: string;
  brandName: string;
  industry?: string;
  positioning?: string;
  promise?: string;
}) {
  const brandName = normalizeRequiredText(input.brandName, "品牌名称");
  const existing = findBrandProfileByName(input.workspaceId, brandName);
  if (existing) {
    return existing;
  }

  return createBrandProfile({
    workspaceId: input.workspaceId,
    userId: input.userId,
    name: brandName,
    industry: input.industry,
    positioning: input.positioning,
    promise: input.promise,
    metadata: {
      sourceType: "USER_UPLOAD",
      createdFrom: "persona.create"
    }
  });
}

function ensurePersonaRule(input: {
  persona: PersonaProfile;
  type: string;
  rule: string;
  severity?: PersonaRule["severity"];
}) {
  const existing = store.personaRules.find(
    (item) =>
      item.workspaceId === input.persona.workspaceId &&
      item.personaId === input.persona.id &&
      item.type === input.type &&
      item.rule === input.rule
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const record: PersonaRule = {
    id: nextId("persona_rule"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    type: input.type,
    rule: input.rule,
    severity: input.severity ?? "medium",
    createdAt: now,
    updatedAt: now
  };
  store.personaRules.unshift(record);
  return record;
}

function ensureForbiddenExpression(input: {
  persona: PersonaProfile;
  expression: string;
  reason?: string;
  replacement?: string;
}) {
  const existing = store.forbiddenExpressions.find(
    (item) =>
      item.workspaceId === input.persona.workspaceId &&
      item.personaId === input.persona.id &&
      item.expression === input.expression
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const record: ForbiddenExpression = {
    id: nextId("forbidden_expression"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    expression: input.expression,
    reason: input.reason ?? "该表达不符合人设或合规边界，需要发布前人工复核。",
    replacement: input.replacement,
    createdAt: now,
    updatedAt: now
  };
  store.forbiddenExpressions.unshift(record);
  return record;
}

function ensureToneExample(input: { persona: PersonaProfile; content: string; title?: string; tags?: string[] }) {
  const existing = store.toneExamples.find(
    (item) =>
      item.workspaceId === input.persona.workspaceId &&
      item.personaId === input.persona.id &&
      item.content === input.content
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const record: ToneExample = {
    id: nextId("tone_example"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    title: input.title ?? `风格样例 ${store.toneExamples.filter((item) => item.personaId === input.persona.id).length + 1}`,
    content: input.content,
    tags: input.tags ?? ["人设语气"],
    createdAt: now,
    updatedAt: now
  };
  store.toneExamples.unshift(record);
  return record;
}

function ensureTargetAudience(input: {
  persona: PersonaProfile;
  name: string;
  painPoints?: string[];
  goals?: string[];
  channels?: Platform[];
}) {
  const existing = store.targetAudiences.find(
    (item) =>
      item.workspaceId === input.persona.workspaceId && item.personaId === input.persona.id && item.name === input.name
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const record: TargetAudience = {
    id: nextId("target_audience"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    name: input.name,
    painPoints: input.painPoints ?? ["内容表达不稳定", "缺少可复盘的判断标准"],
    goals: input.goals ?? ["保持人设一致", "提升内容生产协作效率"],
    channels: input.channels ?? defaultAudienceChannels,
    createdAt: now,
    updatedAt: now
  };
  store.targetAudiences.unshift(record);
  return record;
}

function addPersonaMemoryChunk(input: {
  persona: PersonaProfile;
  content: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const record: PersonaMemoryChunk = {
    id: nextId("persona_memory"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    sourceType: "USER_UPLOAD",
    sourceId: input.sourceId,
    content: input.content,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now
  };
  store.personaMemoryChunks.unshift(record);
  return record;
}

function syncPersonaMemoryRecords(persona: PersonaProfile) {
  ensurePersonaRule({
    persona,
    type: "voice",
    rule: persona.voiceGuide,
    severity: "high"
  });

  persona.highFrequencyWords.forEach((word) => {
    ensurePersonaRule({
      persona,
      type: "keyword",
      rule: `高频表达：${word}`,
      severity: "low"
    });
  });
  persona.forbiddenExpressions.forEach((expression) => {
    ensureForbiddenExpression({ persona, expression });
  });
  persona.toneExamples.forEach((example, index) => {
    ensureToneExample({ persona, content: example, title: `风格样例 ${index + 1}` });
  });
  persona.targetAudiences.forEach((audience) => {
    ensureTargetAudience({ persona, name: audience });
  });
}

function snapshotPersona(persona: PersonaProfile): PersonaVersionSnapshot {
  return {
    brandProfileId: persona.brandProfileId,
    brandName: persona.brandName,
    name: persona.name,
    voiceGuide: persona.voiceGuide,
    coreAudience: persona.coreAudience,
    highFrequencyWords: [...persona.highFrequencyWords],
    forbiddenExpressions: [...persona.forbiddenExpressions],
    targetAudiences: [...persona.targetAudiences],
    toneExamples: [...persona.toneExamples],
    reviewStatus: persona.reviewStatus
  };
}

function recordPersonaVersion(input: {
  persona: PersonaProfile;
  summary: string;
  reviewerId?: string;
}): PersonaVersion {
  const now = new Date().toISOString();
  const version: PersonaVersion = {
    id: nextId("persona_version"),
    workspaceId: input.persona.workspaceId,
    personaId: input.persona.id,
    version: input.persona.version,
    summary: input.summary,
    snapshot: snapshotPersona(input.persona),
    status: input.persona.reviewStatus,
    reviewerId: input.reviewerId,
    approvedAt: input.persona.reviewStatus === "APPROVED" ? now : undefined,
    createdAt: now,
    updatedAt: now
  };
  store.personaVersions.unshift(version);
  return version;
}

function applyLatestPersonaVersionReview(input: {
  persona: PersonaProfile;
  userId: string;
  previousReviewStatus: PersonaProfile["reviewStatus"];
}) {
  if (input.previousReviewStatus === input.persona.reviewStatus || input.persona.reviewStatus !== "APPROVED") {
    return undefined;
  }

  const latestVersion = listPersonaVersions(input.persona.workspaceId, input.persona.id)[0];
  if (!latestVersion) {
    return undefined;
  }

  const now = new Date().toISOString();
  latestVersion.status = "APPROVED";
  latestVersion.snapshot = {
    ...latestVersion.snapshot,
    reviewStatus: "APPROVED"
  };
  latestVersion.reviewerId = input.userId;
  latestVersion.approvedAt = now;
  latestVersion.updatedAt = now;
  return latestVersion;
}

export function createPersona(input: {
  workspaceId: string;
  userId: string;
  brandProfileId?: string;
  brandName?: string;
  brandIndustry?: string;
  brandPositioning?: string;
  brandPromise?: string;
  name: string;
  voiceGuide: string;
  coreAudience: string;
}) {
  const brandProfile = input.brandProfileId
    ? getBrandProfile(input.workspaceId, input.brandProfileId)
    : ensureBrandProfileForPersona({
        workspaceId: input.workspaceId,
        userId: input.userId,
        brandName: input.brandName ?? "",
        industry: input.brandIndustry,
        positioning: input.brandPositioning,
        promise: input.brandPromise
      });
  const brandName = brandProfile.name;
  const persona: PersonaProfile = {
    id: nextId("persona"),
    workspaceId: input.workspaceId,
    brandProfileId: brandProfile.id,
    brandName,
    name: input.name,
    voiceGuide: input.voiceGuide,
    coreAudience: input.coreAudience,
    highFrequencyWords: [],
    forbiddenExpressions: [],
    targetAudiences: [input.coreAudience],
    toneExamples: [],
    version: 1,
    reviewStatus: "DRAFT",
    updatedAt: new Date().toISOString()
  };
  store.personas.unshift(persona);
  addPersonaMemoryChunk({
    persona,
    content: `${brandName} / ${input.name}：${input.voiceGuide}`,
    metadata: { source: "persona.create", brandProfileId: brandProfile.id, coreAudience: input.coreAudience }
  });
  syncPersonaMemoryRecords(persona);
  const version = recordPersonaVersion({
    persona,
    reviewerId: input.userId,
    summary: `初始人设版本：${persona.name}`
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.create",
    entityType: "PersonaProfile",
    entityId: persona.id,
    summary: `创建人设：${persona.name}`,
    metadata: { versionId: version.id, version: version.version, brandProfileId: brandProfile.id }
  });
  return persona;
}

export function updatePersona(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: Partial<PersonaProfile>;
}) {
  const persona = getPersona(input.workspaceId, input.id);
  const previousReviewStatus = persona.reviewStatus;
  if (input.patch.brandProfileId !== undefined) {
    const brandProfile = getBrandProfile(input.workspaceId, input.patch.brandProfileId);
    input.patch.brandName = brandProfile.name;
  } else if (input.patch.brandName !== undefined) {
    const brandProfile = ensureBrandProfileForPersona({
      workspaceId: input.workspaceId,
      userId: input.userId,
      brandName: input.patch.brandName
    });
    input.patch.brandProfileId = brandProfile.id;
    input.patch.brandName = brandProfile.name;
  }
  Object.assign(persona, input.patch, { updatedAt: new Date().toISOString() });
  syncPersonaMemoryRecords(persona);
  const reviewedVersion = applyLatestPersonaVersionReview({
    persona,
    userId: input.userId,
    previousReviewStatus
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.update",
    entityType: "PersonaProfile",
    entityId: persona.id,
    summary: `更新人设：${persona.name}`,
    metadata: {
      brandProfileId: persona.brandProfileId,
      previousReviewStatus,
      nextReviewStatus: persona.reviewStatus,
      reviewedVersionId: reviewedVersion?.id,
      reviewedVersion: reviewedVersion?.version
    }
  });
  return persona;
}

export async function importPersonaContent(input: {
  workspaceId: string;
  userId: string;
  personaId: string;
  importedContent: string;
  brandNotes?: string;
}) {
  const persona = getPersona(input.workspaceId, input.personaId);
  const previousVersion = persona.version;
  const beforeRunIds = new Set(store.agentRuns.map((run) => run.id));
  const agent = new PersonaAgent(input.workspaceId, input.userId);
  const output = await agent.run({
    personaId: input.personaId,
    importedContent: input.importedContent,
    brandNotes: input.brandNotes ?? ""
  });
  const agentRun = store.agentRuns.find((run) => !beforeRunIds.has(run.id) && run.agentType === "PERSONA");
  const memoryChunk = addPersonaMemoryChunk({
    persona,
    content: input.importedContent,
    sourceId: agentRun?.id,
    metadata: {
      brandNotes: input.brandNotes,
      version: persona.version,
      agentRunId: agentRun?.id
    }
  });
  output.structurePreferences.forEach((preference) => {
    ensurePersonaRule({
      persona,
      type: "structure",
      rule: preference,
      severity: "medium"
    });
  });
  syncPersonaMemoryRecords(persona);
  const version = recordPersonaVersion({
    persona,
    reviewerId: input.userId,
    summary: output.versionSummary
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.import_content",
    entityType: "PersonaProfile",
    entityId: persona.id,
    summary: `导入历史内容并生成人设版本：${persona.name}`,
    metadata: {
      versionId: version.id,
      previousVersion,
      nextVersion: persona.version,
      reviewStatus: persona.reviewStatus,
      versionSummary: output.versionSummary,
      memoryChunkId: memoryChunk.id,
      agentRunId: agentRun?.id
    }
  });
  return output;
}

export function generatePersonaVersion(input: { workspaceId: string; userId: string; personaId: string }) {
  const persona = getPersona(input.workspaceId, input.personaId);
  const previousVersion = persona.version;
  persona.version += 1;
  persona.reviewStatus = "REVIEWING";
  persona.updatedAt = new Date().toISOString();
  const version = recordPersonaVersion({
    persona,
    reviewerId: input.userId,
    summary: `人工创建待审版本：${persona.name} v${persona.version}`
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.generate_version",
    entityType: "PersonaVersion",
    entityId: version.id,
    summary: `创建人设待审版本：${persona.name} v${persona.version}`,
    metadata: {
      personaId: persona.id,
      previousVersion,
      nextVersion: persona.version,
      reviewStatus: persona.reviewStatus
    }
  });
  return { persona, version };
}

export function listPersonaVersions(workspaceId: string, personaId: string) {
  getPersona(workspaceId, personaId);
  return store.personaVersions
    .filter((version) => version.workspaceId === workspaceId && version.personaId === personaId)
    .sort((a, b) => b.version - a.version);
}
