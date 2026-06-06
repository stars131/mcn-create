import { PersonaAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { PersonaProfile } from "@/types/domain";

export function listPersonas(workspaceId: string) {
  return getWorkspaceScoped(store.personas, workspaceId);
}

export function getPersona(workspaceId: string, id: string) {
  const persona = store.personas.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!persona) {
    throw new Error("人设不存在");
  }
  return persona;
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
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "persona.create",
    entityType: "PersonaProfile",
    entityId: persona.id,
    summary: `创建人设：${persona.name}`
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
  const agent = new PersonaAgent(input.workspaceId, input.userId);
  return agent.run({
    personaId: input.personaId,
    importedContent: input.importedContent,
    brandNotes: input.brandNotes ?? ""
  });
}

export function listPersonaVersions(workspaceId: string, personaId: string) {
  const persona = getPersona(workspaceId, personaId);
  return Array.from({ length: persona.version }, (_, index) => ({
    id: `${persona.id}_v${index + 1}`,
    version: index + 1,
    summary: index + 1 === persona.version ? "当前版本" : "历史版本快照",
    status: index + 1 === persona.version ? persona.reviewStatus : "APPROVED",
    createdAt: new Date(Date.now() - (persona.version - index) * 86400000).toISOString()
  }));
}
