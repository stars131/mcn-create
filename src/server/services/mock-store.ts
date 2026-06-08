import { promptTemplates } from "@/server/ai/prompts/templates";
import type {
  ABHypothesis,
  AgentFeedback,
  AgentOutput,
  AgentPromptTemplate,
  AgentRun,
  AgentStep,
  AnalyticsReport,
  ApiKey,
  AccountMetricDaily,
  AuditLog,
  BrandProfile,
  CalendarItem,
  CommentInsight,
  ContentBlock,
  ContentDraft,
  ContentReview,
  ContentRiskCheck,
  ContentTemplate,
  ContentVersion,
  CreditLedger,
  DataSource,
  ErrorLog,
  Experiment,
  HotCluster,
  HotItem,
  HotSignal,
  HotTrendSnapshot,
  ImportedMetricFile,
  Invitation,
  MetricRecord,
  CompetitorAccount,
  ForbiddenExpression,
  KeywordWatch,
  Notification,
  PersonaMemoryChunk,
  PersonaProfile,
  PersonaRule,
  PersonaVersion,
  PlatformAdaptation,
  PlatformAccount,
  PlatformAuthorization,
  Platform,
  MediaAsset,
  PostMetricDaily,
  PublishedPost,
  PublishPlan,
  Recommendation,
  SystemSetting,
  TargetAudience,
  TeamMember,
  ToneExample,
  Topic,
  TopicAngle,
  TopicBrief,
  TopicScore,
  TopicStatusHistory,
  UsageEvent,
  User,
  WebhookEndpoint,
  Workspace
} from "@/types/domain";

const now = new Date();
const iso = (offsetDays = 0) => new Date(now.getTime() + offsetDays * 86400000).toISOString();

export interface MockStore {
  users: User[];
  workspaces: Workspace[];
  invitations: Invitation[];
  hotItems: HotItem[];
  hotClusters: HotCluster[];
  hotSignals: HotSignal[];
  hotTrendSnapshots: HotTrendSnapshot[];
  competitorAccounts: CompetitorAccount[];
  keywordWatches: KeywordWatch[];
  topics: Topic[];
  topicAngles: TopicAngle[];
  topicScores: TopicScore[];
  topicStatusHistories: TopicStatusHistory[];
  topicBriefs: TopicBrief[];
  brandProfiles: BrandProfile[];
  personas: PersonaProfile[];
  personaVersions: PersonaVersion[];
  personaMemoryChunks: PersonaMemoryChunk[];
  personaRules: PersonaRule[];
  forbiddenExpressions: ForbiddenExpression[];
  toneExamples: ToneExample[];
  targetAudiences: TargetAudience[];
  contentDrafts: ContentDraft[];
  contentVersions: ContentVersion[];
  contentBlocks: ContentBlock[];
  contentTemplates: ContentTemplate[];
  mediaAssets: MediaAsset[];
  platformAdaptations: PlatformAdaptation[];
  contentReviews: ContentReview[];
  contentRiskChecks: ContentRiskCheck[];
  publishPlans: PublishPlan[];
  publishedPosts: PublishedPost[];
  postMetricDaily: PostMetricDaily[];
  accountMetricDaily: AccountMetricDaily[];
  calendarItems: CalendarItem[];
  dataSources: DataSource[];
  platformAccounts: PlatformAccount[];
  platformAuthorizations: PlatformAuthorization[];
  importedMetricFiles: ImportedMetricFile[];
  metricRecords: MetricRecord[];
  analyticsReports: AnalyticsReport[];
  commentInsights: CommentInsight[];
  experiments: Experiment[];
  abHypotheses: ABHypothesis[];
  recommendations: Recommendation[];
  agentRuns: AgentRun[];
  agentSteps: AgentStep[];
  agentPromptTemplates: AgentPromptTemplate[];
  agentOutputs: AgentOutput[];
  agentFeedback: AgentFeedback[];
  auditLogs: AuditLog[];
  errorLogs: ErrorLog[];
  notifications: Notification[];
  usageEvents: UsageEvent[];
  creditLedger: CreditLedger[];
  apiKeys: ApiKey[];
  webhookEndpoints: WebhookEndpoint[];
  systemSettings: SystemSetting[];
  teamMembers: TeamMember[];
}

type ContentOsGlobal = typeof globalThis & {
  __contentOsMockStore?: MockStore;
};

export const defaultWorkspace: Workspace = {
  id: "ws_demo",
  name: "ContentOS 增长工作室",
  slug: "contentos-growth",
  organizationName: "星河内容实验室",
  currentPlan: "MVP Team"
};

export const secondaryWorkspace: Workspace = {
  id: "ws_brand",
  name: "品牌客户 A",
  slug: "brand-client-a",
  organizationName: "星河内容实验室",
  currentPlan: "Client"
};

export const privateWorkspace: Workspace = {
  id: "ws_private",
  name: "隔离客户 B",
  slug: "private-client-b",
  organizationName: "外部隔离组织",
  currentPlan: "Locked"
};

const trend = [
  { time: "08:00", heat: 61, growth: 18 },
  { time: "10:00", heat: 68, growth: 24 },
  { time: "12:00", heat: 75, growth: 39 },
  { time: "14:00", heat: 84, growth: 52 },
  { time: "16:00", heat: 91, growth: 68 }
];

const seedContentDraftText =
  "很多团队的问题不是不会生成，而是生成之后没人知道这篇内容是否符合品牌。先做一份可审阅的人设记忆：语气、禁用表达、目标受众、风格样例。再把热点、选题、草稿、日历和复盘串起来，内容产能才会稳定。";
const seedContentDraftV1Text =
  "很多团队不是缺少 AI 工具，而是缺少一套能被审阅、复盘和协作的内容流程。先把人设、选题、草稿和日历串起来，再谈生成效率。";

const initialStore: MockStore = {
  users: [
    {
      id: "user_owner",
      email: "owner@contentos.local",
      name: "林澈",
      currentWorkspaceId: defaultWorkspace.id,
      role: "OWNER"
    },
    {
      id: "user_editor",
      email: "editor@contentos.local",
      name: "周安",
      currentWorkspaceId: defaultWorkspace.id,
      role: "EDITOR"
    },
    {
      id: "user_analyst",
      email: "analyst@contentos.local",
      name: "陈棠",
      currentWorkspaceId: defaultWorkspace.id,
      role: "ANALYST"
    }
  ],
  workspaces: [defaultWorkspace, secondaryWorkspace, privateWorkspace],
  invitations: [
    {
      id: "invitation_001",
      workspaceId: defaultWorkspace.id,
      email: "pending-editor@contentos.local",
      roleKey: "EDITOR",
      token: "invite_demo_editor",
      invitedById: "user_owner",
      status: "PENDING",
      expiresAt: iso(7),
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "invitation_002",
      workspaceId: secondaryWorkspace.id,
      email: "brand-viewer@contentos.local",
      roleKey: "VIEWER",
      token: "invite_brand_viewer",
      invitedById: "user_owner",
      status: "PENDING",
      expiresAt: iso(5),
      createdAt: iso(-2),
      updatedAt: iso(-2)
    }
  ],
  hotItems: [
    {
      id: "hot_001",
      workspaceId: defaultWorkspace.id,
      platform: "XIAOHONGSHU",
      title: "小团队用 AI 做一周内容排期的真实复盘",
      industry: "内容运营",
      heatScore: 92,
      growthScore: 71,
      riskLevel: "LOW",
      riskTags: ["效率工具", "案例复盘"],
      suggestedAngles: ["展示排期前后对比", "拆解多人协作流程", "强调人工审核边界"],
      observedAt: iso(),
      trend
    },
    {
      id: "hot_002",
      workspaceId: defaultWorkspace.id,
      platform: "DOUYIN",
      title: "创始人 IP 如何避免内容越做越散",
      industry: "个人 IP",
      heatScore: 88,
      growthScore: 64,
      riskLevel: "LOW",
      riskTags: ["人设一致性", "增长方法"],
      suggestedAngles: ["从人设记忆层切入", "用禁用表达做反例", "串联内容日历"],
      observedAt: iso(),
      trend: trend.map((point) => ({ ...point, heat: point.heat - 6, growth: point.growth - 3 }))
    },
    {
      id: "hot_003",
      workspaceId: defaultWorkspace.id,
      platform: "BILIBILI",
      title: "B 站知识区长视频脚本如何压缩到 90 秒短内容",
      industry: "知识内容",
      heatScore: 79,
      growthScore: 58,
      riskLevel: "MEDIUM",
      riskTags: ["版权引用", "事实核查"],
      suggestedAngles: ["同主题多平台改写", "保留论证链路", "加风险检查清单"],
      observedAt: iso(),
      trend: trend.map((point) => ({ ...point, heat: point.heat - 13, growth: point.growth - 8 }))
    },
    {
      id: "hot_004",
      workspaceId: secondaryWorkspace.id,
      platform: "WECHAT",
      title: "私域品牌如何用季度主题降低内容内耗",
      industry: "品牌内容",
      heatScore: 74,
      growthScore: 41,
      riskLevel: "LOW",
      riskTags: ["私域", "季度策略"],
      suggestedAngles: ["主题资产沉淀", "公众号长文结构", "复盘指标"],
      observedAt: iso(),
      trend
    }
  ],
  hotClusters: [
    {
      id: "cluster_001",
      workspaceId: defaultWorkspace.id,
      name: "AI 内容工作流进入团队协作阶段",
      summary: "热点从单次生成转向排期、审核、复盘的工作流，适合强调合规数据和人设记忆。",
      trendReason: "小团队开始追求稳定产能，单点 AI 工具无法承接多人协作和复盘。",
      platforms: ["XIAOHONGSHU", "DOUYIN", "BILIBILI"],
      heatScore: 90,
      growthScore: 67,
      riskLevel: "LOW",
      suggestedAngles: ["创作者版内容驾驶舱", "从选题到复盘的闭环", "AI 只是协作层而不是代运营"]
    }
  ],
  hotSignals: [
    {
      id: "hot_signal_001",
      workspaceId: defaultWorkspace.id,
      hotItemId: "hot_001",
      clusterId: "cluster_001",
      signalType: "growth_spike",
      title: "小团队 AI 排期内容增速高于同类话题",
      confidence: 0.86,
      detectedAt: iso(),
      metadata: {
        sourceType: "MOCK",
        growthScore: 71,
        reason: "短时间内收藏和分享模拟指标连续上升"
      },
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "hot_signal_002",
      workspaceId: defaultWorkspace.id,
      hotItemId: "hot_002",
      clusterId: "cluster_001",
      signalType: "persona_fit",
      title: "创始人 IP 内容跑偏与人设记忆高度匹配",
      confidence: 0.82,
      detectedAt: iso(-1),
      metadata: {
        sourceType: "MOCK",
        matchedKeywords: ["人设一致性", "内容越做越散"]
      },
      createdAt: iso(-1),
      updatedAt: iso(-1)
    }
  ],
  hotTrendSnapshots: [
    {
      id: "hot_trend_snapshot_001",
      workspaceId: defaultWorkspace.id,
      hotItemId: "hot_001",
      capturedAt: iso(),
      heatScore: 92,
      growthScore: 71,
      metrics: {
        mentions: 128,
        shares: 420,
        saves: 980
      },
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "hot_trend_snapshot_002",
      workspaceId: defaultWorkspace.id,
      clusterId: "cluster_001",
      capturedAt: iso(),
      heatScore: 90,
      growthScore: 67,
      metrics: {
        itemCount: 3,
        averageHeat: 86,
        averageGrowth: 64
      },
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  competitorAccounts: [
    {
      id: "competitor_001",
      workspaceId: defaultWorkspace.id,
      platform: "XIAOHONGSHU",
      handle: "workflow_creator_lab",
      displayName: "工作流创作者实验室",
      tags: ["内容运营", "AI 工具", "小团队"],
      sourceType: "PUBLIC_COMPLIANT",
      createdAt: iso(-6),
      updatedAt: iso(-1)
    },
    {
      id: "competitor_002",
      workspaceId: defaultWorkspace.id,
      platform: "DOUYIN",
      handle: "ip_growth_ops",
      displayName: "IP 增长运营手记",
      tags: ["职业 IP", "人设一致性"],
      sourceType: "PUBLIC_COMPLIANT",
      createdAt: iso(-5),
      updatedAt: iso(-1)
    }
  ],
  keywordWatches: [
    {
      id: "keyword_watch_001",
      workspaceId: defaultWorkspace.id,
      keyword: "人设记忆",
      industry: "内容运营",
      platforms: ["XIAOHONGSHU", "DOUYIN", "WECHAT"],
      enabled: true,
      createdAt: iso(-8),
      updatedAt: iso(-1)
    },
    {
      id: "keyword_watch_002",
      workspaceId: defaultWorkspace.id,
      keyword: "多平台改写",
      industry: "知识内容",
      platforms: ["BILIBILI", "DOUYIN", "WECHAT"],
      enabled: true,
      createdAt: iso(-7),
      updatedAt: iso(-1)
    }
  ],
  topics: [
    {
      id: "topic_001",
      workspaceId: defaultWorkspace.id,
      title: "为什么小团队需要先做人设记忆，而不是先买更多 AI 工具",
      angle: "用内容跑偏和多人协作内耗作为冲突点，解释人设记忆层的价值。",
      audience: "1-10 人内容团队负责人",
      status: "ADOPTED",
      targetPlatforms: ["XIAOHONGSHU", "WECHAT"],
      score: 87,
      hotItemId: "hot_002",
      personaId: "persona_001",
      riskLevel: "LOW",
      outline: ["常见误区", "人设记忆的三层结构", "从选题到审核的落地流程"],
      createdAt: iso(-1)
    },
    {
      id: "topic_002",
      workspaceId: defaultWorkspace.id,
      title: "一条热点如何拆成小红书、抖音和公众号三个版本",
      angle: "展示同一 brief 在不同平台的结构化改写。",
      audience: "职业 IP 与小型 MCN 编辑",
      status: "WRITING",
      targetPlatforms: ["XIAOHONGSHU", "DOUYIN", "WECHAT"],
      score: 82,
      hotItemId: "hot_001",
      personaId: "persona_001",
      riskLevel: "LOW",
      outline: ["热点判断", "平台差异", "模板化改写", "风险复核"],
      createdAt: iso(-2)
    }
  ],
  topicAngles: [
    {
      id: "topic_angle_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      title: "先做人设记忆，而不是先买更多 AI 工具",
      hook: "为什么同一团队用同一套 AI 工具，内容还是越写越散？",
      outline: ["内容跑偏的真实场景", "人设记忆的三层字段", "如何接入选题、审核和复盘"],
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "topic_angle_002",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_002",
      title: "同一热点的三平台拆解方法",
      hook: "不是把一篇稿子复制到三个平台，而是先保留 brief，再按平台重写结构。",
      outline: ["共用核心 brief", "小红书图文结构", "抖音口播结构", "公众号长文结构"],
      createdAt: iso(-2),
      updatedAt: iso(-2)
    }
  ],
  topicScores: [
    {
      id: "topic_score_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      relevance: 93,
      competition: 42,
      businessValue: 88,
      executionDifficulty: 36,
      rationale: "与人设记忆、团队协作和合规审阅强相关，适合作为 ContentOS 的核心教育选题。",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "topic_score_002",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_002",
      relevance: 89,
      competition: 51,
      businessValue: 84,
      executionDifficulty: 45,
      rationale: "多平台改写是高频需求，执行难度适中，需要补充平台差异和风险复核。",
      createdAt: iso(-2),
      updatedAt: iso(-2)
    }
  ],
  topicStatusHistories: [
    {
      id: "topic_status_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      toStatus: "PENDING",
      changedById: "user_owner",
      reason: "热点 Agent 生成候选选题",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "topic_status_002",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      fromStatus: "PENDING",
      toStatus: "ADOPTED",
      changedById: "user_owner",
      reason: "选题适合人设记忆教育场景，进入内容计划",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "topic_status_003",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_002",
      toStatus: "PENDING",
      changedById: "user_editor",
      reason: "热点 Agent 生成候选选题",
      createdAt: iso(-2),
      updatedAt: iso(-2)
    },
    {
      id: "topic_status_004",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_002",
      fromStatus: "PENDING",
      toStatus: "WRITING",
      changedById: "user_editor",
      reason: "已生成 brief，进入写作中",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    }
  ],
  topicBriefs: [
    {
      id: "brief_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      version: 1,
      summary: "从团队内容跑偏的真实场景切入，说明人设记忆层如何统一语气、禁忌和受众判断。",
      outline: ["先讲跑偏案例", "拆解记忆层字段", "给出三步上线建议"],
      cta: "引导读者领取内容工作流检查表",
      materialNotes: "可引用过往爆文标题和评论区反馈，不使用未经授权平台数据。",
      createdAt: iso(-1)
    }
  ],
  brandProfiles: [
    {
      id: "brand_profile_001",
      workspaceId: defaultWorkspace.id,
      name: "ContentOS",
      industry: "中文内容运营与创作者工具",
      positioning: "面向职业 IP、小品牌内容团队和小型 MCN 的创作决策与执行工作台",
      promise: "用可审阅的品牌记忆、合规数据来源和多人协作流程稳定内容产能。",
      metadata: {
        sourceType: "MOCK",
        brandKeywords: ["工作流", "人设记忆", "合规审计", "多平台改写"],
        complianceBoundaries: ["不承诺全自动代运营", "不绕过平台规则", "不采集未授权平台数据"]
      },
      createdAt: iso(-10),
      updatedAt: iso()
    },
    {
      id: "brand_profile_002",
      workspaceId: secondaryWorkspace.id,
      name: "品牌客户 A",
      industry: "私域品牌内容",
      positioning: "围绕季度主题沉淀品牌资产的客户内容工作台",
      promise: "把公众号长文、私域素材和复盘数据整理成可复用的内容流程。",
      metadata: {
        sourceType: "MOCK",
        brandKeywords: ["私域", "季度主题", "内容资产"],
        complianceBoundaries: ["仅使用客户授权素材", "保留人工审阅"]
      },
      createdAt: iso(-4),
      updatedAt: iso(-1)
    }
  ],
  personas: [
    {
      id: "persona_001",
      workspaceId: defaultWorkspace.id,
      brandProfileId: "brand_profile_001",
      brandName: "ContentOS",
      name: "务实型内容增长顾问",
      voiceGuide:
        "表达直接、具体、克制。先讲业务问题，再给流程和判断标准。避免夸大承诺，不使用玄学增长词。",
      coreAudience: "中文内容创业者、小品牌内容负责人、小型 MCN 主理人",
      highFrequencyWords: ["工作流", "闭环", "审计", "复盘", "人设一致性"],
      forbiddenExpressions: ["稳赚", "全自动代运营", "一键爆款", "绕过平台限制"],
      targetAudiences: ["职业 IP", "3-10 人内容团队", "多账号代运营团队"],
      toneExamples: [
        "先把选题和人设放在同一个系统里，再谈生成效率。",
        "AI 可以提速，但发布前必须有人审、可追踪、可复盘。"
      ],
      version: 3,
      reviewStatus: "APPROVED",
      updatedAt: iso()
    }
  ],
  personaVersions: [
    {
      id: "persona_version_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      version: 1,
      summary: "初始人设版本：明确内容工作流与合规边界。",
      snapshot: {
        brandProfileId: "brand_profile_001",
        brandName: "ContentOS",
        name: "务实型内容增长顾问",
        voiceGuide: "表达直接、具体、克制。先讲业务问题，再给流程和判断标准。",
        coreAudience: "中文内容创业者、小品牌内容负责人、小型 MCN 主理人",
        highFrequencyWords: ["工作流", "闭环", "复盘"],
        forbiddenExpressions: ["稳赚", "全自动代运营"],
        targetAudiences: ["职业 IP", "3-10 人内容团队"],
        toneExamples: ["先把选题和人设放在同一个系统里，再谈生成效率。"],
        reviewStatus: "APPROVED"
      },
      status: "APPROVED",
      reviewerId: "user_owner",
      approvedAt: iso(-10),
      createdAt: iso(-10),
      updatedAt: iso(-10)
    },
    {
      id: "persona_version_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      version: 2,
      summary: "补充禁用表达和多账号团队受众画像。",
      snapshot: {
        brandProfileId: "brand_profile_001",
        brandName: "ContentOS",
        name: "务实型内容增长顾问",
        voiceGuide: "表达直接、具体、克制。先讲业务问题，再给流程和判断标准。避免夸大承诺。",
        coreAudience: "中文内容创业者、小品牌内容负责人、小型 MCN 主理人",
        highFrequencyWords: ["工作流", "闭环", "审计", "复盘"],
        forbiddenExpressions: ["稳赚", "全自动代运营", "一键爆款"],
        targetAudiences: ["职业 IP", "3-10 人内容团队", "多账号代运营团队"],
        toneExamples: [
          "先把选题和人设放在同一个系统里，再谈生成效率。",
          "AI 可以提速，但发布前必须有人审、可追踪、可复盘。"
        ],
        reviewStatus: "APPROVED"
      },
      status: "APPROVED",
      reviewerId: "user_owner",
      approvedAt: iso(-5),
      createdAt: iso(-5),
      updatedAt: iso(-5)
    },
    {
      id: "persona_version_003",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      version: 3,
      summary: "当前批准版本：加入人设一致性和平台限制边界。",
      snapshot: {
        brandProfileId: "brand_profile_001",
        brandName: "ContentOS",
        name: "务实型内容增长顾问",
        voiceGuide:
          "表达直接、具体、克制。先讲业务问题，再给流程和判断标准。避免夸大承诺，不使用玄学增长词。",
        coreAudience: "中文内容创业者、小品牌内容负责人、小型 MCN 主理人",
        highFrequencyWords: ["工作流", "闭环", "审计", "复盘", "人设一致性"],
        forbiddenExpressions: ["稳赚", "全自动代运营", "一键爆款", "绕过平台限制"],
        targetAudiences: ["职业 IP", "3-10 人内容团队", "多账号代运营团队"],
        toneExamples: [
          "先把选题和人设放在同一个系统里，再谈生成效率。",
          "AI 可以提速，但发布前必须有人审、可追踪、可复盘。"
        ],
        reviewStatus: "APPROVED"
      },
      status: "APPROVED",
      reviewerId: "user_owner",
      approvedAt: iso(),
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  personaMemoryChunks: [
    {
      id: "persona_memory_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      sourceType: "USER_UPLOAD",
      sourceId: "seed_persona_case_001",
      content: "历史内容强调工作流、合规来源、人工审核和数据复盘，不把 AI 描述成全自动代运营。",
      metadata: {
        importedBy: "user_owner",
        version: 3,
        tags: ["历史内容", "合规边界", "工作流"]
      },
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "persona_memory_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      sourceType: "USER_UPLOAD",
      sourceId: "seed_persona_case_002",
      content: "评论区反复追问如何避免内容跑偏，适合用人设记忆、禁用表达和审核流程作为解释框架。",
      metadata: {
        importedBy: "user_owner",
        version: 3,
        tags: ["评论反馈", "人设一致性"]
      },
      createdAt: iso(-3),
      updatedAt: iso()
    }
  ],
  personaRules: [
    {
      id: "persona_rule_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      type: "voice",
      rule: "先界定业务问题，再给流程、判断标准和人工审核边界。",
      severity: "high",
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "persona_rule_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      type: "structure",
      rule: "优先使用问题场景开头、三段式流程、结尾检查清单的结构。",
      severity: "medium",
      createdAt: iso(-4),
      updatedAt: iso()
    }
  ],
  forbiddenExpressions: [
    {
      id: "forbidden_expression_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      expression: "稳赚",
      reason: "容易形成绝对化收益承诺，触发高风险内容场景。",
      replacement: "可验证的增长假设",
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "forbidden_expression_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      expression: "全自动代运营",
      reason: "产品定位不是替代运营团队，必须强调人工审核和合规数据来源。",
      replacement: "辅助内容决策与执行",
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "forbidden_expression_003",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      expression: "绕过平台限制",
      reason: "违反合规原则，平台能力必须通过合法授权或用户上传数据接入。",
      replacement: "遵守平台规则",
      createdAt: iso(-4),
      updatedAt: iso()
    }
  ],
  toneExamples: [
    {
      id: "tone_example_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      title: "工作流优先",
      content: "先把选题和人设放在同一个系统里，再谈生成效率。",
      tags: ["克制", "流程", "业务问题"],
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "tone_example_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      title: "人工审核边界",
      content: "AI 可以提速，但发布前必须有人审、可追踪、可复盘。",
      tags: ["合规", "审核", "复盘"],
      createdAt: iso(-4),
      updatedAt: iso()
    }
  ],
  targetAudiences: [
    {
      id: "target_audience_001",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      name: "职业 IP 主理人",
      painPoints: ["内容越做越散", "热点追不上但又怕跑偏", "缺少复盘依据"],
      goals: ["保持人设一致", "稳定选题质量", "减少人工返工"],
      channels: ["XIAOHONGSHU", "DOUYIN", "WECHAT"],
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "target_audience_002",
      workspaceId: defaultWorkspace.id,
      personaId: "persona_001",
      name: "小品牌内容负责人",
      painPoints: ["团队协作成本高", "发布前缺少风险审核", "跨平台改写重复劳动"],
      goals: ["统一内容流程", "沉淀品牌记忆", "用复盘指导下一轮选题"],
      channels: ["WECHAT", "XIAOHONGSHU", "VIDEO_ACCOUNT"],
      createdAt: iso(-4),
      updatedAt: iso()
    }
  ],
  contentDrafts: [
    {
      id: "content_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      personaId: "persona_001",
      title: "小团队别急着买更多 AI 工具",
      platform: "XIAOHONGSHU",
      format: "图文",
      content: seedContentDraftText,
      status: "IN_REVIEW",
      currentVersion: 2,
      riskLevel: "LOW",
      riskItems: ["未发现高风险承诺", "建议补充案例来源说明"],
      createdAt: iso(-1),
      updatedAt: iso()
    }
  ],
  contentVersions: [
    {
      id: "content_version_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      version: 1,
      content: seedContentDraftV1Text,
      changeNote: "AI 初稿生成",
      createdById: "user_owner",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "content_version_002",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      version: 2,
      content: seedContentDraftText,
      changeNote: "人工补充人设记忆和复盘链路",
      createdById: "user_owner",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  contentBlocks: [
    {
      id: "content_block_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      type: "hook",
      sortOrder: 1,
      body: "很多团队的问题不是不会生成，而是生成之后没人知道这篇内容是否符合品牌。",
      metadata: { templateId: "template_xhs_image_text_v1", label: "开场钩子", required: true },
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "content_block_002",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      type: "workflow",
      sortOrder: 2,
      body: "先做一份可审阅的人设记忆：语气、禁用表达、目标受众、风格样例。",
      metadata: { templateId: "template_xhs_image_text_v1", label: "流程拆解", required: true },
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "content_block_003",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      type: "cta",
      sortOrder: 3,
      body: "再把热点、选题、草稿、日历和复盘串起来，内容产能才会稳定。",
      metadata: { templateId: "template_xhs_image_text_v1", label: "行动引导", required: true },
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  contentTemplates: [
    {
      id: "template_xhs_image_text_v1",
      workspaceId: defaultWorkspace.id,
      name: "小红书图文工作流模板",
      platform: "XIAOHONGSHU",
      format: "图文",
      schema: {
        blocks: [
          { type: "hook", label: "开场钩子", required: true },
          { type: "persona", label: "人设语气", required: true },
          { type: "brief", label: "核心 brief", required: true },
          { type: "body", label: "正文展开", required: true },
          { type: "cta", label: "行动引导", required: true }
        ],
        outputTips: ["标题避免绝对化承诺", "正文保留人工审核与来源说明", "结尾引导下载清单或预约诊断"]
      },
      systemPrompt: "按小红书图文结构输出，先给冲突问题，再给流程清单和低风险 CTA。",
      version: 1,
      createdAt: iso(-2),
      updatedAt: iso()
    },
    {
      id: "template_douyin_talk_v1",
      workspaceId: defaultWorkspace.id,
      name: "抖音口播稿模板",
      platform: "DOUYIN",
      format: "口播稿",
      schema: {
        blocks: [
          { type: "hook", label: "前三秒开场", required: true },
          { type: "scene", label: "用户场景", required: true },
          { type: "talking_points", label: "口播要点", required: true },
          { type: "cta", label: "收束 CTA", required: true }
        ],
        outputTips: ["短句优先", "每段不超过 20 秒", "保留风险检查提示"]
      },
      systemPrompt: "按抖音口播节奏输出，强化前三秒钩子、短句和自然转场。",
      version: 1,
      createdAt: iso(-2),
      updatedAt: iso()
    },
    {
      id: "template_wechat_long_v1",
      workspaceId: defaultWorkspace.id,
      name: "公众号长文模板",
      platform: "WECHAT",
      format: "长文",
      schema: {
        blocks: [
          { type: "intro", label: "问题导入", required: true },
          { type: "analysis", label: "原因拆解", required: true },
          { type: "workflow", label: "操作流程", required: true },
          { type: "conclusion", label: "结尾总结", required: true }
        ],
        outputTips: ["给出可复盘的步骤", "保留来源说明", "适合延展案例和图表"]
      },
      systemPrompt: "按公众号长文结构输出，强调论证链路、案例来源和复盘方法。",
      version: 1,
      createdAt: iso(-2),
      updatedAt: iso()
    },
    {
      id: "template_bilibili_script_v1",
      workspaceId: defaultWorkspace.id,
      name: "B 站视频脚本模板",
      platform: "BILIBILI",
      format: "视频脚本",
      schema: {
        blocks: [
          { type: "opening", label: "开场问题", required: true },
          { type: "chapters", label: "分段脚本", required: true },
          { type: "risk_note", label: "引用与风险提示", required: true },
          { type: "cta", label: "结尾互动", required: true }
        ],
        outputTips: ["注明引用来源", "分段适配字幕", "保留复盘指标"]
      },
      systemPrompt: "按 B 站知识视频脚本输出，保留分段、引用提示和字幕友好表达。",
      version: 1,
      createdAt: iso(-2),
      updatedAt: iso()
    },
    {
      id: "template_video_account_short_v1",
      workspaceId: defaultWorkspace.id,
      name: "视频号短内容模板",
      platform: "VIDEO_ACCOUNT",
      format: "短内容",
      schema: {
        blocks: [
          { type: "hook", label: "开场钩子", required: true },
          { type: "points", label: "三点内容", required: true },
          { type: "cta", label: "转化引导", required: true }
        ],
        outputTips: ["适合转发到私域", "语气克制", "避免承诺式结论"]
      },
      systemPrompt: "按视频号短内容输出，保留私域转发语境和克制 CTA。",
      version: 1,
      createdAt: iso(-2),
      updatedAt: iso()
    }
  ],
  mediaAssets: [
    {
      id: "media_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      name: "内容工作流检查表封面",
      assetType: "cover_prompt",
      url: "mock://assets/content-workflow-checklist-cover",
      sourceType: "USER_UPLOAD",
      metadata: {
        usage: "小红书封面文案参考",
        alt: "内容工作流、人设记忆、风险审核、数据复盘四步检查表"
      },
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  platformAdaptations: [
    {
      id: "adaptation_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      platform: "DOUYIN",
      title: "小团队别急着买更多 AI 工具（DOUYIN 版）",
      body: `${seedContentDraftText}\n\n平台适配：抖音口播版需要更强开场钩子、短句节奏和明确 CTA。`,
      checklist: ["强化前三秒开场", "保留人工审核提示", "结尾引导领取清单"],
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  contentReviews: [
    {
      id: "content_review_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      reviewerId: "user_owner",
      status: "IN_REVIEW",
      comment: "等待补充案例来源后再发布。",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  contentRiskChecks: [
    {
      id: "content_risk_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      riskLevel: "LOW",
      riskItems: ["未发现高风险承诺", "建议补充案例来源说明"],
      rewriteSuggestions: ["在结尾补充“仅基于授权数据与人工审核”的说明。"],
      sourceAgentRunId: "run_002",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  publishPlans: [
    {
      id: "publish_plan_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      platform: "XIAOHONGSHU",
      scheduledAt: iso(1),
      ownerId: "user_owner",
      status: "PLANNED",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  publishedPosts: [
    {
      id: "published_post_001",
      workspaceId: defaultWorkspace.id,
      contentDraftId: "content_001",
      platform: "XIAOHONGSHU",
      platformPostId: "xhs_mock_001",
      url: "mock://xiaohongshu/posts/xhs_mock_001",
      publishedAt: iso(-5),
      metrics: {
        views: 38600,
        likes: 2100,
        comments: 318,
        shares: 420,
        conversions: 96
      },
      createdAt: iso(-5),
      updatedAt: iso(-4)
    }
  ],
  postMetricDaily: [
    {
      id: "post_metric_daily_001",
      workspaceId: defaultWorkspace.id,
      publishedPostId: "published_post_001",
      platform: "XIAOHONGSHU",
      metricDate: iso(-5),
      views: 18200,
      likes: 960,
      comments: 132,
      shares: 180,
      conversions: 42,
      createdAt: iso(-5),
      updatedAt: iso(-5)
    },
    {
      id: "post_metric_daily_002",
      workspaceId: defaultWorkspace.id,
      publishedPostId: "published_post_001",
      platform: "XIAOHONGSHU",
      metricDate: iso(-4),
      views: 20400,
      likes: 1140,
      comments: 186,
      shares: 240,
      conversions: 54,
      createdAt: iso(-4),
      updatedAt: iso(-4)
    }
  ],
  accountMetricDaily: [
    {
      id: "account_metric_daily_001",
      workspaceId: defaultWorkspace.id,
      platformAccountId: "platform_account_001",
      platform: "XIAOHONGSHU",
      metricDate: iso(-5),
      followers: 12800,
      impressions: 42600,
      engagementRate: 6.7,
      createdAt: iso(-5),
      updatedAt: iso(-5)
    },
    {
      id: "account_metric_daily_002",
      workspaceId: defaultWorkspace.id,
      platformAccountId: "platform_account_002",
      platform: "DOUYIN",
      metricDate: iso(-4),
      followers: 21800,
      impressions: 58200,
      engagementRate: 7.8,
      createdAt: iso(-4),
      updatedAt: iso(-4)
    }
  ],
  calendarItems: [
    {
      id: "cal_001",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_001",
      contentDraftId: "content_001",
      title: "小团队别急着买更多 AI 工具",
      platform: "XIAOHONGSHU",
      scheduledAt: iso(1),
      ownerName: "林澈",
      status: "PLANNED"
    },
    {
      id: "cal_002",
      workspaceId: defaultWorkspace.id,
      topicId: "topic_002",
      title: "一条热点拆三端版本",
      platform: "DOUYIN",
      scheduledAt: iso(3),
      ownerName: "周安",
      status: "READY"
    }
  ],
  dataSources: [
    {
      id: "source_001",
      workspaceId: defaultWorkspace.id,
      name: "Mock 全网热点源",
      sourceType: "MOCK",
      platform: "ALL",
      authorizationStatus: "MOCKED",
      lastSyncedAt: iso(),
      notes: "MVP 内置模拟数据，仅用于演示热点闭环。"
    },
    {
      id: "source_002",
      workspaceId: defaultWorkspace.id,
      name: "内容表现 CSV 导入",
      sourceType: "USER_UPLOAD",
      platform: "ALL",
      authorizationStatus: "CONNECTED",
      lastSyncedAt: iso(-1),
      notes: "支持 CSV/JSON 手动导入，后续可接官方授权 API。"
    }
  ],
  platformAccounts: [
    {
      id: "platform_account_001",
      workspaceId: defaultWorkspace.id,
      platform: "XIAOHONGSHU",
      handle: "contentos_lab",
      displayName: "ContentOS 小红书账号",
      accountUrl: "https://www.xiaohongshu.com/user/profile/contentos_lab",
      status: "CONNECTED",
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "platform_account_002",
      workspaceId: defaultWorkspace.id,
      platform: "DOUYIN",
      handle: "contentos_ai",
      displayName: "ContentOS 抖音号",
      accountUrl: "https://www.douyin.com/user/contentos_ai",
      status: "MOCKED",
      createdAt: iso(-3),
      updatedAt: iso()
    },
    {
      id: "platform_account_003",
      workspaceId: secondaryWorkspace.id,
      platform: "WECHAT",
      handle: "brand_client_a",
      displayName: "品牌客户 A 公众号",
      status: "CONNECTED",
      createdAt: iso(-2),
      updatedAt: iso()
    }
  ],
  platformAuthorizations: [
    {
      id: "platform_auth_001",
      workspaceId: defaultWorkspace.id,
      platformAccountId: "platform_account_001",
      platform: "XIAOHONGSHU",
      authorizationStatus: "CONNECTED",
      scopes: ["read_metrics", "read_comments", "read_profile"],
      tokenRef: "vault://mock/xiaohongshu/contentos_lab",
      lastSyncedAt: iso(),
      createdAt: iso(-4),
      updatedAt: iso()
    },
    {
      id: "platform_auth_002",
      workspaceId: defaultWorkspace.id,
      platformAccountId: "platform_account_002",
      platform: "DOUYIN",
      authorizationStatus: "MOCKED",
      scopes: ["read_hotspots", "read_metrics", "publish_plan"],
      tokenRef: "mock://douyin/contentos_ai",
      lastSyncedAt: iso(-1),
      createdAt: iso(-3),
      updatedAt: iso(-1)
    },
    {
      id: "platform_auth_003",
      workspaceId: secondaryWorkspace.id,
      platformAccountId: "platform_account_003",
      platform: "WECHAT",
      authorizationStatus: "CONNECTED",
      scopes: ["read_metrics", "read_comments"],
      tokenRef: "vault://mock/wechat/brand_client_a",
      lastSyncedAt: iso(-2),
      createdAt: iso(-2),
      updatedAt: iso(-2)
    }
  ],
  importedMetricFiles: [
    {
      id: "import_file_001",
      workspaceId: defaultWorkspace.id,
      fileName: "week-23-content-performance.csv",
      fileType: "CSV",
      sourceType: "USER_UPLOAD",
      rowCount: 2,
      status: "PARSED",
      parsedData: [
        {
          title: "一周内容排期复盘",
          platform: "XIAOHONGSHU",
          publishedAt: iso(-5),
          views: 38600,
          likes: 2100,
          comments: 318,
          shares: 420,
          conversions: 96
        },
        {
          title: "创始人 IP 人设跑偏",
          platform: "DOUYIN",
          publishedAt: iso(-3),
          views: 58200,
          likes: 3500,
          comments: 446,
          shares: 610,
          conversions: 128
        }
      ],
      createdAt: iso(-1),
      updatedAt: iso(-1)
    }
  ],
  metricRecords: [
    {
      id: "metric_001",
      workspaceId: defaultWorkspace.id,
      importedMetricFileId: "import_file_001",
      title: "一周内容排期复盘",
      platform: "XIAOHONGSHU",
      publishedAt: iso(-5),
      views: 38600,
      likes: 2100,
      comments: 318,
      shares: 420,
      conversions: 96
    },
    {
      id: "metric_002",
      workspaceId: defaultWorkspace.id,
      importedMetricFileId: "import_file_001",
      title: "创始人 IP 人设跑偏",
      platform: "DOUYIN",
      publishedAt: iso(-3),
      views: 58200,
      likes: 3500,
      comments: 446,
      shares: 610,
      conversions: 128
    }
  ],
  analyticsReports: [
    {
      id: "report_001",
      workspaceId: defaultWorkspace.id,
      title: "第 23 周内容复盘",
      period: "2026-06-01 至 2026-06-07",
      summary: "人设一致性和工具链复盘类内容表现最好，抖音转化更高，小红书收藏率更稳定。",
      anomalies: ["B 站长视频脚本主题播放低于账号基线 18%", "周三晚间发布的图文收藏率异常上升"],
      recommendations: ["追加 3 条多平台改写案例", "把人设禁用表达整理成可下载清单"],
      hypotheses: ["标题中加入团队规模会提高点击率", "展示前后对比图能提升收藏率"],
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso()
    }
  ],
  commentInsights: [
    {
      id: "comment_insight_001",
      workspaceId: defaultWorkspace.id,
      metricRecordId: "metric_002",
      sentiment: "MIXED",
      summary: "评论集中追问人设跑偏后的修正流程，也有人担心 AI 自动改写会削弱品牌表达。",
      keywords: ["人设一致性", "禁用表达", "人工审核"],
      sourceReportId: "report_001",
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  experiments: [
    {
      id: "experiment_001",
      workspaceId: defaultWorkspace.id,
      name: "团队规模标题变量测试",
      hypothesis: "标题中加入团队规模会提高点击率",
      status: "PLANNED",
      metric: "点击率",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  abHypotheses: [
    {
      id: "ab_hypothesis_001",
      workspaceId: defaultWorkspace.id,
      experimentId: "experiment_001",
      title: "标题中加入团队规模会提高点击率",
      variantA: "小团队如何稳定内容排期",
      variantB: "3-10 人内容团队如何稳定一周排期",
      successMetric: "点击率",
      rationale: "历史数据里带团队规模的标题更容易让目标用户识别适用场景。",
      sourceReportId: "report_001",
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "ab_hypothesis_002",
      workspaceId: defaultWorkspace.id,
      experimentId: "experiment_001",
      title: "展示前后对比图能提升收藏率",
      variantA: "纯文字流程清单",
      variantB: "排期前后对比图加流程清单",
      successMetric: "收藏率",
      rationale: "周三晚间图文收藏率异常上升，可能与对比图降低理解成本有关。",
      sourceReportId: "report_001",
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  recommendations: [
    {
      id: "recommendation_001",
      workspaceId: defaultWorkspace.id,
      sourceType: "ANALYTICS_REPORT",
      title: "追加 3 条多平台改写案例",
      rationale: "多平台改写类内容带来更稳定的收藏和分享，适合回流到选题池形成案例拆解。",
      targetModule: "TOPIC",
      status: "OPEN",
      sourceReportId: "report_001",
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "recommendation_002",
      workspaceId: defaultWorkspace.id,
      sourceType: "ANALYTICS_REPORT",
      title: "把人设禁用表达整理成可下载清单",
      rationale: "评论区反复追问禁用表达和审核边界，适合补充到人设记忆与内容素材库。",
      targetModule: "PERSONA",
      status: "OPEN",
      sourceReportId: "report_001",
      sourceAgentRunId: "run_analytics_001",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  agentRuns: [
    {
      id: "run_001",
      workspaceId: defaultWorkspace.id,
      userId: "user_owner",
      agentType: "HOTSPOT",
      status: "SUCCESS",
      input: { platforms: ["ALL"], window: "24h" },
      output: { clusters: 1, items: 3 },
      model: "mock-contentos-v1",
      tokenUsage: { prompt: 920, completion: 480, total: 1400 },
      costEstimate: 0,
      latencyMs: 620,
      startedAt: iso(),
      finishedAt: iso(),
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "run_002",
      workspaceId: defaultWorkspace.id,
      userId: "user_owner",
      agentType: "RISK",
      status: "SUCCESS",
      input: { contentDraftId: "content_001", content: seedContentDraftText },
      output: { riskLevel: "LOW" },
      model: "mock-contentos-v1",
      tokenUsage: { prompt: 430, completion: 220, total: 650 },
      costEstimate: 0,
      latencyMs: 310,
      startedAt: iso(),
      finishedAt: iso(),
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  agentSteps: [
    {
      id: "agent_step_001",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_001",
      name: "validate_input",
      status: "SUCCESS",
      input: { platforms: ["ALL"], window: "24h" },
      output: { accepted: true },
      latencyMs: 4,
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "agent_step_002",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_001",
      name: "model_call",
      status: "SUCCESS",
      input: { agentType: "HOTSPOT", promptName: "hotspot-summary" },
      output: { clusters: 1, items: 3 },
      latencyMs: 620,
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "agent_step_003",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_002",
      name: "validate_input",
      status: "SUCCESS",
      input: { contentDraftId: "content_001" },
      output: { accepted: true },
      latencyMs: 3,
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "agent_step_004",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_002",
      name: "model_call",
      status: "SUCCESS",
      input: { agentType: "RISK", promptName: "risk-check" },
      output: { riskLevel: "LOW" },
      latencyMs: 310,
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  agentPromptTemplates: promptTemplates.map((template) => ({
    id: `prompt_template_${template.name.replace(/[^a-z0-9]+/gi, "_")}_v${template.version}`,
    agentType: template.agentType,
    name: template.name,
    version: template.version,
    systemPrompt: template.systemPrompt,
    userPrompt: template.userPrompt,
    active: true,
    createdAt: iso(-2),
    updatedAt: iso()
  })),
  agentOutputs: [
    {
      id: "agent_output_001",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_001",
      entityType: "HotCluster",
      entityId: "cluster_001",
      payload: { clusters: 1, items: 3 },
      createdAt: iso(),
      updatedAt: iso()
    },
    {
      id: "agent_output_002",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_002",
      entityType: "ContentRiskCheck",
      entityId: "content_risk_001",
      payload: { riskLevel: "LOW" },
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  agentFeedback: [
    {
      id: "agent_feedback_001",
      workspaceId: defaultWorkspace.id,
      agentRunId: "run_001",
      userId: "user_owner",
      rating: 5,
      comment: "热点摘要能直接回流选题池，保留为默认流程。",
      createdAt: iso(),
      updatedAt: iso()
    }
  ],
  auditLogs: [
    {
      id: "audit_001",
      workspaceId: defaultWorkspace.id,
      userId: "user_owner",
      action: "hotspot.refresh",
      entityType: "HotItem",
      summary: "刷新 mock 热点数据并生成热点簇",
      metadata: { sourceType: "MOCK", compliant: true },
      createdAt: iso()
    }
  ],
  errorLogs: [],
  notifications: [
    {
      id: "notification_001",
      workspaceId: defaultWorkspace.id,
      userId: "user_owner",
      title: "人设版本待审阅",
      body: "务实型内容增长顾问的人设版本已进入 REVIEWING，可在记忆层查看差异。",
      createdAt: iso(-1),
      updatedAt: iso(-1)
    },
    {
      id: "notification_002",
      workspaceId: defaultWorkspace.id,
      title: "本周数据复盘已生成",
      body: "Analytics Agent 已生成周报，并沉淀 A/B 假设与选题回流建议。",
      readAt: iso(),
      createdAt: iso(-2),
      updatedAt: iso()
    }
  ],
  usageEvents: [
    {
      id: "usage_001",
      workspaceId: defaultWorkspace.id,
      userId: "user_owner",
      eventType: "agent.run",
      quantity: 2,
      metadata: { agentTypes: ["HOTSPOT", "RISK"] },
      createdAt: iso()
    },
    {
      id: "usage_002",
      workspaceId: secondaryWorkspace.id,
      userId: "user_owner",
      eventType: "analytics.report",
      quantity: 1,
      metadata: { reportId: "report_001" },
      createdAt: iso(-1)
    }
  ],
  creditLedger: [
    {
      id: "credit_001",
      workspaceId: defaultWorkspace.id,
      delta: 5000,
      balance: 5000,
      reason: "MVP 初始额度",
      metadata: { plan: defaultWorkspace.currentPlan },
      createdAt: iso(-20)
    },
    {
      id: "credit_002",
      workspaceId: defaultWorkspace.id,
      delta: -120,
      balance: 4880,
      reason: "Agent mock 运行消耗",
      metadata: { agentRunIds: ["run_001", "run_002"] },
      createdAt: iso()
    },
    {
      id: "credit_003",
      workspaceId: secondaryWorkspace.id,
      delta: 2000,
      balance: 2000,
      reason: "客户 workspace 初始额度",
      metadata: { plan: secondaryWorkspace.currentPlan },
      createdAt: iso(-4)
    }
  ],
  apiKeys: [
    {
      id: "api_key_001",
      workspaceId: defaultWorkspace.id,
      name: "Server ingest key",
      keyPrefix: "cos_live_demo",
      keyHash: "mock_hash_server_ingest_key",
      lastUsedAt: iso(-1),
      createdById: "user_owner",
      createdAt: iso(-7)
    }
  ],
  webhookEndpoints: [
    {
      id: "webhook_001",
      workspaceId: defaultWorkspace.id,
      name: "Agent run notifier",
      url: "https://example.com/contentos/webhook",
      secretHash: "mock_hash_webhook_secret",
      events: ["agent.run.success", "content.scheduled"],
      enabled: true,
      createdAt: iso(-5),
      updatedAt: iso(-1)
    }
  ],
  systemSettings: [
    {
      id: "system_setting_001",
      key: "data_retention_policy",
      value: {
        metricDays: 365,
        auditDays: 730,
        authorizationCacheDays: 30,
        errorLogDays: 90
      },
      createdAt: iso(-10),
      updatedAt: iso(-1)
    },
    {
      id: "system_setting_002",
      workspaceId: defaultWorkspace.id,
      key: "ai_provider_policy",
      value: {
        provider: "mock",
        allowExternalModels: false,
        requireAgentAudit: true
      },
      createdAt: iso(-8),
      updatedAt: iso(-1)
    },
    {
      id: "system_setting_003",
      workspaceId: defaultWorkspace.id,
      key: "risk_review_policy",
      value: {
        requireRiskCheckBeforeSchedule: true,
        restrictedDomains: ["医疗", "金融", "法律", "时政"]
      },
      createdAt: iso(-8),
      updatedAt: iso(-1)
    }
  ],
  teamMembers: [
    {
      id: "member_001",
      workspaceId: defaultWorkspace.id,
      name: "林澈",
      email: "owner@contentos.local",
      role: "OWNER",
      title: "主理人",
      joinedAt: iso(-20)
    },
    {
      id: "member_002",
      workspaceId: defaultWorkspace.id,
      name: "周安",
      email: "editor@contentos.local",
      role: "EDITOR",
      title: "内容编辑",
      joinedAt: iso(-12)
    },
    {
      id: "member_003",
      workspaceId: defaultWorkspace.id,
      name: "陈棠",
      email: "analyst@contentos.local",
      role: "ANALYST",
      title: "数据分析",
      joinedAt: iso(-6)
    },
    {
      id: "member_004",
      workspaceId: secondaryWorkspace.id,
      name: "林澈",
      email: "owner@contentos.local",
      role: "OWNER",
      title: "客户负责人",
      joinedAt: iso(-4)
    }
  ]
};

const globalStore = globalThis as ContentOsGlobal;

export const store: MockStore =
  globalStore.__contentOsMockStore ?? (globalStore.__contentOsMockStore = initialStore);

export function nextId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function getWorkspaceScoped<T extends { workspaceId: string }>(items: T[], workspaceId = defaultWorkspace.id) {
  return items.filter((item) => item.workspaceId === workspaceId);
}

export function normalizePlatform(platform?: string | null): Platform | undefined {
  if (!platform || platform === "ALL") {
    return undefined;
  }

  const allowed: Platform[] = [
    "DOUYIN",
    "XIAOHONGSHU",
    "BILIBILI",
    "WECHAT",
    "WEIBO",
    "KUAISHOU",
    "VIDEO_ACCOUNT",
    "OTHER"
  ];
  return allowed.includes(platform as Platform) ? (platform as Platform) : undefined;
}
