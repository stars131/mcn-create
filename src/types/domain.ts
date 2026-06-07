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
export type AgentType = "HOTSPOT" | "TOPIC" | "PERSONA" | "CONTENT" | "ANALYTICS" | "RISK";
export type AgentStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

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

export interface CalendarItem {
  id: string;
  workspaceId: string;
  topicId?: string;
  contentDraftId?: string;
  title: string;
  platform: Platform;
  scheduledAt: string;
  ownerName: string;
  status: "PLANNED" | "READY" | "EXPORTED" | "PUBLISHED" | "FAILED";
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

export interface MetricRecord {
  id: string;
  workspaceId: string;
  title: string;
  platform: Platform;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions: number;
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
  createdAt: string;
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
  createdAt: string;
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

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  joinedAt: string;
}
