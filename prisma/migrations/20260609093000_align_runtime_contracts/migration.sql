-- Align persisted schema with the runtime domain contracts used by the MVP UI/services.
CREATE TYPE "PersonaReviewStatus" AS ENUM ('DRAFT', 'REVIEWING', 'APPROVED');

ALTER TABLE "PersonaProfile"
  ADD COLUMN "brandName" TEXT,
  ADD COLUMN "forbiddenExpressions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "targetAudiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "toneExamples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "reviewStatus" "PersonaReviewStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "PersonaVersion"
  ADD COLUMN "status" "PersonaReviewStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "DataSource"
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ContentDraft"
  ADD COLUMN "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
  ADD COLUMN "riskItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CommentInsight"
  ADD COLUMN "metricRecordId" TEXT,
  ADD COLUMN "sourceReportId" TEXT;

ALTER TABLE "AnalyticsReport"
  ADD COLUMN "period" TEXT,
  ADD COLUMN "hypotheses" JSONB;

ALTER TABLE "ABHypothesis"
  ADD COLUMN "sourceReportId" TEXT,
  ADD COLUMN "sourceAgentRunId" TEXT;

ALTER TABLE "Recommendation"
  ADD COLUMN "sourceReportId" TEXT,
  ADD COLUMN "generatedTopicIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ApiKey"
  ADD COLUMN "keyPrefix" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "requestId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "publicMessage" TEXT NOT NULL,
    "errorName" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErrorLog_workspaceId_status_idx" ON "ErrorLog"("workspaceId", "status");
CREATE INDEX "ErrorLog_requestId_idx" ON "ErrorLog"("requestId");
