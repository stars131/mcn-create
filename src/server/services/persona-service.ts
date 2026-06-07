import { PersonaAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { PersonaProfile, PersonaVersion, PersonaVersionSnapshot } from "@/types/domain";

export function listPersonas(workspaceId: string) {
  return getWorkspaceScoped(store.personas, workspaceId);
}

export function getPersona(workspaceId: string, id: string) {
  const persona = store.personas.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!persona) {
    throw new ApiError("人设不存在", 404);
  }
  return persona;
}

function snapshotPersona(persona: PersonaProfile): PersonaVersionSnapshot {
  return {
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

export function createPersona(input: {
  workspaceId: string;
  userId: string;
  brandName: string;
  name: string;
  voiceGuide: string;
  coreAudience: string;
}) {
  const persona: PersonaProfile = {
    id: nextId("persona"),
    workspaceId: input.workspaceId,
    brandName: input.brandName,
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
    metadata: { versionId: version.id, version: version.version }
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
  Object.assign(persona, input.patch, { updatedAt: new Date().toISOString() });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.update",
    entityType: "PersonaProfile",
    entityId: persona.id,
    summary: `更新人设：${persona.name}`
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
  const agent = new PersonaAgent(input.workspaceId, input.userId);
  const output = await agent.run({
    personaId: input.personaId,
    importedContent: input.importedContent,
    brandNotes: input.brandNotes ?? ""
  });
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
      versionSummary: output.versionSummary
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
