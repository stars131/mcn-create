export type RoleKey = "OWNER" | "ADMIN" | "EDITOR" | "ANALYST" | "VIEWER";

export type Platform =
  | "ALL"
  | "DOUYIN"
  | "XIAOHONGSHU"
  | "BILIBILI"
  | "WECHAT"
  | "WEIBO"
  | "KUAISHOU"
  | "VIDEO_ACCOUNT"
  | "OTHER";

export type SourceType =
  | "OFFICIAL_API"
  | "USER_AUTHORIZED"
  | "USER_UPLOAD"
  | "PUBLIC_COMPLIANT"
  | "THIRD_PARTY_LEGAL"
  | "MOCK";

export type AuthorizationStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "EXPIRED"
  | "REVOKED"
  | "MOCKED";

export type TopicStatus = "PENDING" | "ADOPTED" | "WRITING" | "PUBLISHED" | "DROPPED";
export type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SCHEDULED" | "PUBLISHED";
export type PublishStatus = "PLANNED" | "READY" | "EXPORTED" | "PUBLISHED" | "FAILED";
export type AgentType = "HOTSPOT" | "TOPIC" | "PERSONA" | "CONTENT" | "ANALYTICS" | "RISK";
export type AgentStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type MetricImportFileType = "RECORDS" | "JSON" | "CSV" | "TSV" | "EXCEL";
export type ImportedMetricFileStatus = "PARSED" | "FAILED";
export type ExperimentStatus = "PLANNED" | "RUNNING" | "COMPLETED" | "PAUSED";
export type RecommendationStatus = "OPEN" | "CONVERTED" | "DISMISSED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  organizationName: string;
  currentPlan: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  currentWorkspaceId: string;
  role: RoleKey;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  roleKey: RoleKey;
  token: string;
  invitedById: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotItem {
  id: string;
  workspaceId: string;
  platform: Platform;
  title: string;
  industry: string;
  heatScore: number;
  growthScore: number;
  riskLevel: RiskLevel;
  riskTags: string[];
  suggestedAngles: string[];
  observedAt: string;
  trend: Array<{ time: string; heat: number; growth: number }>;
}

export interface HotCluster {
  id: string;
  workspaceId: string;
  name: string;
  summary: string;
  trendReason: string;
  platforms: Platform[];
  heatScore: number;
  growthScore: number;
  riskLevel: RiskLevel;
  suggestedAngles: string[];
}

export interface HotSignal {
  id: string;
  workspaceId: string;
  hotItemId?: string;
  clusterId?: string;
  signalType: string;
  title: string;
  confidence: number;
  detectedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface HotTrendSnapshot {
  id: string;
  workspaceId: string;
  hotItemId?: string;
  clusterId?: string;
  capturedAt: string;
  heatScore: number;
  growthScore: number;
  metrics: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  handle: string;
  displayName: string;
  tags: string[];
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordWatch {
  id: string;
  workspaceId: string;
  keyword: string;
  industry: string;
  platforms: Platform[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  workspaceId: string;
  title: string;
  angle: string;
  audience: string;
  status: TopicStatus;
  targetPlatforms: Platform[];
  score: number;
  hotItemId?: string;
  personaId?: string;
  riskLevel: RiskLevel;
  outline: string[];
  sourceAgentRunId?: string;
  createdAt: string;
}

export interface TopicAngle {
  id: string;
  workspaceId: string;
  topicId: string;
  title: string;
  hook: string;
  outline: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TopicScore {
  id: string;
  workspaceId: string;
  topicId: string;
  relevance: number;
  competition: number;
  businessValue: number;
  executionDifficulty: number;
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicStatusHistory {
  id: string;
  workspaceId: string;
  topicId: string;
  fromStatus?: TopicStatus;
  toStatus: TopicStatus;
  changedById?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicBrief {
  id: string;
  workspaceId: string;
  topicId: string;
  version: number;
  summary: string;
  outline: string[];
  cta: string;
  materialNotes: string;
  createdAt: string;
}

export interface PersonaProfile {
  id: string;
  workspaceId: string;
  brandName: string;
  name: string;
  voiceGuide: string;
  coreAudience: string;
  highFrequencyWords: string[];
  forbiddenExpressions: string[];
  targetAudiences: string[];
  toneExamples: string[];
  version: number;
  reviewStatus: "DRAFT" | "REVIEWING" | "APPROVED";
  updatedAt: string;
}

export interface PersonaVersionSnapshot {
  brandName: string;
  name: string;
  voiceGuide: string;
  coreAudience: string;
  highFrequencyWords: string[];
  forbiddenExpressions: string[];
  targetAudiences: string[];
  toneExamples: string[];
  reviewStatus: PersonaProfile["reviewStatus"];
}

export interface PersonaVersion {
  id: string;
  workspaceId: string;
  personaId: string;
  version: number;
  summary: string;
  snapshot: PersonaVersionSnapshot;
  status: PersonaProfile["reviewStatus"] | "APPROVED";
  reviewerId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaMemoryChunk {
  id: string;
  workspaceId: string;
  personaId: string;
  sourceType: SourceType;
  sourceId?: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaRule {
  id: string;
  workspaceId: string;
  personaId: string;
  type: string;
  rule: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface ForbiddenExpression {
  id: string;
  workspaceId: string;
  personaId?: string;
  expression: string;
  reason: string;
  replacement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToneExample {
  id: string;
  workspaceId: string;
  personaId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TargetAudience {
  id: string;
  workspaceId: string;
  personaId: string;
  name: string;
  painPoints: string[];
  goals: string[];
  channels: Platform[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentDraft {
  id: string;
  workspaceId: string;
  topicId?: string;
  personaId?: string;
  title: string;
  platform: Platform;
  format: string;
  content: string;
  status: ContentStatus;
  currentVersion: number;
  riskLevel: RiskLevel;
  riskItems: string[];
  sourceAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersion {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  version: number;
  content: string;
  changeNote?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  type: string;
  sortOrder: number;
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTemplateSchema {
  blocks: Array<{
    type: string;
    label: string;
    required?: boolean;
  }>;
  outputTips?: string[];
}

export interface ContentTemplate {
  id: string;
  workspaceId: string;
  name: string;
  platform: Platform;
  format: string;
  schema: ContentTemplateSchema;
  systemPrompt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  workspaceId: string;
  contentDraftId?: string;
  name: string;
  assetType: string;
  url: string;
  sourceType: SourceType;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAdaptation {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  platform: Platform;
  title: string;
  body: string;
  checklist?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentReview {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  reviewerId?: string;
  status: ContentStatus;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRiskCheck {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  riskLevel: RiskLevel;
  riskItems: string[];
  rewriteSuggestions: string[];
  sourceAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishPlan {
  id: string;
  workspaceId: string;
  contentDraftId: string;
  platform: Platform;
  scheduledAt: string;
  ownerId?: string;
  status: PublishStatus;
  exportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPost {
  id: string;
  workspaceId: string;
  publishPlanId?: string;
  contentDraftId: string;
  platform: Platform;
  platformPostId?: string;
  url?: string;
  publishedAt: string;
  metrics?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PostMetricDaily {
  id: string;
  workspaceId: string;
  publishedPostId?: string;
  platform: Platform;
  metricDate: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountMetricDaily {
  id: string;
  workspaceId: string;
  platformAccountId?: string;
  platform: Platform;
  metricDate: string;
  followers: number;
  impressions: number;
  engagementRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  workspaceId: string;
  topicId?: string;
  contentDraftId?: string;
  title: string;
  platform: Platform;
  scheduledAt: string;
  ownerName: string;
  status: PublishStatus;
}

export interface DataSource {
  id: string;
  workspaceId: string;
  name: string;
  sourceType: SourceType;
  platform: Platform;
  authorizationStatus: AuthorizationStatus;
  lastSyncedAt?: string;
  notes: string;
}

export interface PlatformAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  handle: string;
  displayName: string;
  accountUrl?: string;
  status: AuthorizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAuthorization {
  id: string;
  workspaceId: string;
  platformAccountId: string;
  platform: Platform;
  authorizationStatus: AuthorizationStatus;
  scopes: string[];
  tokenRef?: string;
  lastSyncedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricRecord {
  id: string;
  workspaceId: string;
  importedMetricFileId?: string;
  title: string;
  platform: Platform;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions: number;
}

export interface ImportedMetricFile {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: MetricImportFileType;
  sourceType: SourceType;
  rowCount: number;
  status: ImportedMetricFileStatus;
  parsedData?: Array<{
    title: string;
    platform: Platform;
    publishedAt: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    conversions: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CommentInsight {
  id: string;
  workspaceId: string;
  metricRecordId?: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
  summary: string;
  keywords: string[];
  sourceReportId?: string;
  sourceAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsReport {
  id: string;
  workspaceId: string;
  title: string;
  period: string;
  summary: string;
  anomalies: string[];
  recommendations: string[];
  hypotheses: string[];
  sourceAgentRunId?: string;
  createdAt: string;
}

export interface Experiment {
  id: string;
  workspaceId: string;
  name: string;
  hypothesis: string;
  status: ExperimentStatus;
  metric: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABHypothesis {
  id: string;
  workspaceId: string;
  experimentId?: string;
  title: string;
  variantA: string;
  variantB: string;
  successMetric: string;
  rationale: string;
  sourceReportId?: string;
  sourceAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  workspaceId: string;
  sourceType: string;
  title: string;
  rationale: string;
  targetModule: "TOPIC" | "PERSONA" | "CONTENT" | "CALENDAR";
  status: RecommendationStatus;
  sourceReportId?: string;
  sourceAgentRunId?: string;
  generatedTopicIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  userId: string;
  agentType: AgentType;
  status: AgentStatus;
  input: unknown;
  output?: unknown;
  model?: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  costEstimate: number;
  latencyMs: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentStep {
  id: string;
  workspaceId: string;
  agentRunId: string;
  name: string;
  status: AgentStatus;
  input?: unknown;
  output?: unknown;
  latencyMs: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPromptTemplate {
  id: string;
  workspaceId?: string;
  agentType: AgentType;
  name: string;
  version: number;
  systemPrompt: string;
  userPrompt: string;
  outputSchema?: unknown;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentOutput {
  id: string;
  workspaceId: string;
  agentRunId: string;
  entityType: string;
  entityId?: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AgentFeedback {
  id: string;
  workspaceId: string;
  agentRunId: string;
  userId?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId?: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  workspaceId: string;
  userId?: string;
  eventType: string;
  quantity: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreditLedger {
  id: string;
  workspaceId: string;
  delta: number;
  balance: number;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdById?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface WebhookEndpoint {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  secretHash?: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  workspaceId?: string;
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  joinedAt: string;
}
