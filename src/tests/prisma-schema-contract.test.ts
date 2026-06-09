import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

function modelBlock(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) {
    throw new Error(`Missing Prisma model: ${name}`);
  }
  return match[1];
}

function expectFields(modelName: string, fields: string[]) {
  const block = modelBlock(modelName);
  fields.forEach((field) => {
    expect(block, `${modelName} should include ${field}`).toContain(field);
  });
}

describe("Prisma schema contract", () => {
  it("persists runtime persona review and memory fields", () => {
    expect(schema).toContain("enum PersonaReviewStatus");
    expectFields("PersonaProfile", [
      "brandName      String?",
      "forbiddenExpressions String[]",
      "targetAudiences String[]",
      "toneExamples   String[]",
      "version        Int",
      "reviewStatus   PersonaReviewStatus"
    ]);
    expectFields("PersonaVersion", ["status      PersonaReviewStatus"]);
  });

  it("persists compliance, risk, analytics backflow, and observability fields", () => {
    expectFields("DataSource", ["notes               String"]);
    expectFields("ContentDraft", ["riskLevel       RiskLevel", "riskItems       String[]"]);
    expectFields("CommentInsight", ["metricRecordId String?", "sourceReportId String?"]);
    expectFields("AnalyticsReport", ["period      String?", "hypotheses  Json?"]);
    expectFields("ABHypothesis", ["sourceReportId String?", "sourceAgentRunId String?"]);
    expectFields("Recommendation", ["sourceReportId String?", "generatedTopicIds String[]"]);
    expectFields("ApiKey", ["keyPrefix   String"]);
    expect(modelBlock("ErrorLog")).toContain("requestId     String");
  });
});
