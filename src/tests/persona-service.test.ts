import { describe, expect, it } from "vitest";
import {
  createPersona,
  generatePersonaVersion,
  importPersonaContent,
  listPersonaVersions
} from "@/server/services/persona-service";
import { store } from "@/server/services/mock-store";

describe("persona service", () => {
  it("imports content into the requested persona and writes version audit metadata", async () => {
    const baselinePersona = store.personas.find((persona) => persona.id === "persona_001");
    expect(baselinePersona).toBeTruthy();
    const baselineVersion = baselinePersona!.version;
    const baselineVoiceGuide = baselinePersona!.voiceGuide;
    const createdPersona = createPersona({
      workspaceId: "ws_demo",
      userId: "user_owner",
      brandName: "Target Brand",
      name: "Target Persona",
      voiceGuide: "Original target voice",
      coreAudience: "Target audience"
    });
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const createdVersions = listPersonaVersions("ws_demo", createdPersona.id);
      expect(createdVersions).toHaveLength(1);
      expect(createdVersions[0]).toMatchObject({
        version: 1,
        status: "DRAFT",
        snapshot: {
          voiceGuide: "Original target voice",
          reviewStatus: "DRAFT"
        }
      });

      const output = await importPersonaContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        personaId: createdPersona.id,
        importedContent: "过去内容强调流程、复盘和审计，不承诺全自动代运营。",
        brandNotes: "保持克制、务实、可审阅。"
      });

      const importedVersions = listPersonaVersions("ws_demo", createdPersona.id);
      const importedVersion = importedVersions[0];
      expect(output.versionSummary).toContain("过去内容强调流程");
      expect(createdPersona).toMatchObject({
        version: 2,
        reviewStatus: "REVIEWING",
        voiceGuide: output.voiceGuide,
        highFrequencyWords: output.highFrequencyWords,
        forbiddenExpressions: output.forbiddenExpressions,
        targetAudiences: output.audiencePortraits
      });
      expect(baselinePersona).toMatchObject({
        version: baselineVersion,
        voiceGuide: baselineVoiceGuide
      });
      expect(importedVersions.map((version) => version.version)).toEqual([2, 1]);
      expect(importedVersion).toMatchObject({
        version: 2,
        summary: output.versionSummary,
        status: "REVIEWING",
        snapshot: {
          voiceGuide: output.voiceGuide,
          forbiddenExpressions: output.forbiddenExpressions,
          reviewStatus: "REVIEWING"
        }
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "persona.import_content",
        entityType: "PersonaProfile",
        entityId: createdPersona.id,
        metadata: {
          versionId: importedVersion.id,
          previousVersion: 1,
          nextVersion: 2,
          reviewStatus: "REVIEWING",
          versionSummary: output.versionSummary
        }
      });
      expect(store.agentRuns.find((run) => !beforeAgentRunIds.has(run.id))).toMatchObject({
        workspaceId: "ws_demo",
        agentType: "PERSONA",
        status: "SUCCESS",
        input: {
          personaId: createdPersona.id
        }
      });

      const generated = generatePersonaVersion({
        workspaceId: "ws_demo",
        userId: "user_owner",
        personaId: createdPersona.id
      });
      expect(generated.persona.version).toBe(3);
      expect(generated.version).toMatchObject({
        personaId: createdPersona.id,
        version: 3,
        status: "REVIEWING",
        snapshot: {
          name: createdPersona.name,
          reviewStatus: "REVIEWING"
        }
      });
      expect(listPersonaVersions("ws_demo", createdPersona.id).map((version) => version.version)).toEqual([3, 2, 1]);
      expect(store.auditLogs[0]).toMatchObject({
        action: "persona.generate_version",
        entityType: "PersonaVersion",
        entityId: generated.version.id,
        metadata: {
          personaId: createdPersona.id,
          previousVersion: 2,
          nextVersion: 3
        }
      });
    } finally {
      store.personas = store.personas.filter((persona) => persona.id !== createdPersona.id);
      store.personaVersions = store.personaVersions.filter((version) => version.personaId !== createdPersona.id);
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
