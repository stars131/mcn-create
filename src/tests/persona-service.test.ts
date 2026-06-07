import { describe, expect, it } from "vitest";
import { createPersona, importPersonaContent, listPersonaVersions } from "@/server/services/persona-service";
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

    try {
      const output = await importPersonaContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        personaId: createdPersona.id,
        importedContent: "过去内容强调流程、复盘和审计，不承诺全自动代运营。",
        brandNotes: "保持克制、务实、可审阅。"
      });

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
      expect(store.auditLogs[0]).toMatchObject({
        action: "persona.import_content",
        entityType: "PersonaProfile",
        entityId: createdPersona.id,
        metadata: {
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
      expect(listPersonaVersions("ws_demo", createdPersona.id)).toHaveLength(2);
    } finally {
      store.personas = store.personas.filter((persona) => persona.id !== createdPersona.id);
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdPersona.id);
    }
  });
});
