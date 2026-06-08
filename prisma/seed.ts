import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const workspaceId = "ws_demo_seed";
const userId = "user_owner_seed";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "contentos-demo" },
    update: {},
    create: {
      name: "星河内容实验室",
      slug: "contentos-demo"
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "contentos-growth"
      }
    },
    update: {
      name: "ContentOS 增长工作室"
    },
    create: {
      id: workspaceId,
      organizationId: organization.id,
      name: "ContentOS 增长工作室",
      slug: "contentos-growth",
      currentPlan: "MVP Team"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "owner@contentos.local" },
    update: {
      name: "林澈"
    },
    create: {
      id: userId,
      email: "owner@contentos.local",
      name: "林澈",
      passwordHash: "mock-password-hash"
    }
  });

  const permissionActions = [
    "workspace.manage",
    "member.manage",
    "data_source.manage",
    "persona.edit",
    "hotspot.read",
    "topic.write",
    "content.write",
    "content.publish",
    "analytics.read",
    "agent.run",
    "audit.read",
    "api_key.manage"
  ];

  const permissions = await Promise.all(
    permissionActions.map((action) =>
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: {
          action,
          description: action
        }
      })
    )
  );

  const roleKeys = ["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"] as const;
  for (const key of roleKeys) {
    const role = await prisma.role.upsert({
      where: {
        workspaceId_key: {
          workspaceId: workspace.id,
          key
        }
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        key,
        name: key,
        description: `${key} role`
      }
    });

    const allowed =
      key === "OWNER"
        ? permissions
        : permissions.filter((permission) => {
            if (key === "ADMIN") return permission.action !== "api_key.manage";
            if (key === "EDITOR") return ["persona.edit", "hotspot.read", "topic.write", "content.write", "content.publish", "agent.run"].includes(permission.action);
            if (key === "ANALYST") return ["hotspot.read", "analytics.read", "topic.write", "agent.run", "audit.read"].includes(permission.action);
            return ["hotspot.read", "analytics.read", "audit.read"].includes(permission.action);
          });

    for (const permission of allowed) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }

    if (key === "OWNER") {
      await prisma.membership.upsert({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: workspace.id
          }
        },
        update: {
          roleId: role.id,
          roleKey: "OWNER"
        },
        create: {
          userId: user.id,
          workspaceId: workspace.id,
          roleId: role.id,
          roleKey: "OWNER",
          title: "主理人"
        }
      });
    }
  }

  const brand = await prisma.brandProfile.create({
    data: {
      workspaceId: workspace.id,
      name: "ContentOS",
      industry: "中文内容运营",
      positioning: "创作者版内容运营驾驶舱",
      promise: "帮助团队把热点、选题、人设、内容、日历和复盘串成合规工作流"
    }
  });

  const persona = await prisma.personaProfile.create({
    data: {
      workspaceId: workspace.id,
      brandProfileId: brand.id,
      name: "务实型内容增长顾问",
      voiceGuide: "表达直接、具体、克制。先讲业务问题，再给流程和判断标准。避免夸大承诺。",
      coreAudience: "中文内容创业者、小品牌内容负责人、小型 MCN 主理人",
      highFrequencyWords: ["工作流", "闭环", "审计", "复盘", "人设一致性"],
      forbiddenTopics: ["医疗建议", "金融收益承诺", "法律结论", "时政判断"]
    }
  });

  await prisma.personaVersion.create({
    data: {
      workspaceId: workspace.id,
      personaId: persona.id,
      version: 1,
      summary: "初始人设版本",
      snapshot: {
        voiceGuide: "表达直接、具体、克制",
        forbiddenExpressions: ["稳赚", "全自动代运营", "一键爆款"]
      }
    }
  });

  const dataSource = await prisma.dataSource.create({
    data: {
      workspaceId: workspace.id,
      name: "Mock 全网热点源",
      sourceType: "MOCK",
      platform: "ALL",
      authorizationStatus: "MOCKED",
      lastSyncedAt: new Date(),
      config: {
        adapter: "mock-platform-adapter"
      }
    }
  });

  const hotItem = await prisma.hotItem.create({
    data: {
      workspaceId: workspace.id,
      dataSourceId: dataSource.id,
      platform: "XIAOHONGSHU",
      title: "小团队用 AI 做一周内容排期的真实复盘",
      industry: "内容运营",
      heatScore: 92,
      growthScore: 71,
      riskLevel: "LOW",
      riskTags: ["效率工具", "案例复盘"],
      suggestedAngles: ["展示排期前后对比", "拆解多人协作流程", "强调人工审核边界"],
      observedAt: new Date(),
      raw: {
        source: "seed"
      }
    }
  });

  await prisma.hotCluster.create({
    data: {
      workspaceId: workspace.id,
      name: "AI 内容工作流进入团队协作阶段",
      summary: "热点从单次生成转向排期、审核、复盘的工作流。",
      trendReason: "小团队开始追求稳定产能。",
      platforms: ["XIAOHONGSHU", "DOUYIN", "BILIBILI"],
      heatScore: 90,
      growthScore: 67,
      riskLevel: "LOW",
      suggestedAngles: ["创作者版内容驾驶舱", "从选题到复盘的闭环"]
    }
  });

  const topic = await prisma.topic.create({
    data: {
      workspaceId: workspace.id,
      title: "为什么小团队需要先做人设记忆，而不是先买更多 AI 工具",
      angle: "用内容跑偏和多人协作内耗作为冲突点，解释人设记忆层的价值。",
      audience: "1-10 人内容团队负责人",
      status: "ADOPTED",
      targetPlatforms: ["XIAOHONGSHU", "WECHAT"],
      score: 87,
      hotItemId: hotItem.id,
      personaId: persona.id,
      riskLevel: "LOW"
    }
  });

  await prisma.topicBrief.create({
    data: {
      workspaceId: workspace.id,
      topicId: topic.id,
      version: 1,
      summary: "从团队内容跑偏场景切入，说明人设记忆层如何统一语气、禁忌和受众判断。",
      outline: ["先讲跑偏案例", "拆解记忆层字段", "给出三步上线建议"],
      cta: "引导读者领取内容工作流检查表",
      materialNotes: "仅使用授权数据、用户上传素材或 mock 数据。"
    }
  });

  const content = await prisma.contentDraft.create({
    data: {
      workspaceId: workspace.id,
      topicId: topic.id,
      personaId: persona.id,
      title: "小团队别急着买更多 AI 工具",
      platform: "XIAOHONGSHU",
      format: "图文",
      content: "很多团队的问题不是不会生成，而是生成之后没人知道这篇内容是否符合品牌。先做一份可审阅的人设记忆。",
      status: "IN_REVIEW",
      currentVersion: 1
    }
  });

  await prisma.contentRiskCheck.create({
    data: {
      workspaceId: workspace.id,
      contentDraftId: content.id,
      riskLevel: "LOW",
      riskItems: ["未发现高风险承诺", "建议补充案例来源说明"],
      rewriteSuggestions: ["保留人工审核入口"]
    }
  });

  await prisma.publishPlan.create({
    data: {
      workspaceId: workspace.id,
      contentDraftId: content.id,
      platform: "XIAOHONGSHU",
      scheduledAt: new Date(Date.now() + 86400000),
      ownerId: user.id,
      status: "PLANNED"
    }
  });

  await prisma.postMetricDaily.create({
    data: {
      workspaceId: workspace.id,
      platform: "XIAOHONGSHU",
      metricDate: new Date(),
      views: 38600,
      likes: 2100,
      comments: 318,
      shares: 420,
      conversions: 96
    }
  });

  const agentRun = await prisma.agentRun.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      agentType: "HOTSPOT",
      status: "SUCCESS",
      input: {
        platforms: ["ALL"],
        window: "24h"
      },
      output: {
        clusters: 1,
        items: 1
      },
      model: "mock-contentos-v1",
      tokenUsage: {
        prompt: 920,
        completion: 480,
        total: 1400
      },
      costEstimate: 0,
      latencyMs: 620,
      startedAt: new Date(),
      finishedAt: new Date()
    }
  });

  await prisma.agentOutput.create({
    data: {
      workspaceId: workspace.id,
      agentRunId: agentRun.id,
      entityType: "HotCluster",
      payload: {
        summary: "热点刷新完成"
      }
    }
  });

  await prisma.analyticsReport.create({
    data: {
      workspaceId: workspace.id,
      title: "第 23 周内容复盘",
      periodStart: new Date(Date.now() - 6 * 86400000),
      periodEnd: new Date(),
      summary: "人设一致性和工具链复盘类内容表现最好。",
      anomalies: ["B 站长视频脚本主题播放低于账号基线 18%"],
      recommendations: ["追加 3 条多平台改写案例"],
      sourceAgentRunId: agentRun.id
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: "seed.bootstrap",
      entityType: "Workspace",
      entityId: workspace.id,
      summary: "初始化 ContentOS MVP 演示数据",
      metadata: {
        compliant: true,
        sourceType: "MOCK"
      }
    }
  });

  await prisma.systemSetting.deleteMany({
    where: {
      workspaceId: null,
      key: "data_retention_policy"
    }
  });
  await prisma.systemSetting.create({
    data: {
      key: "data_retention_policy",
      value: {
        metricDays: 365,
        auditDays: 730,
        authorizationCacheDays: 30,
        errorLogDays: 90
      }
    }
  });

  const prompts = [
    ["HOTSPOT", "hotspot-summary", "输入热点原始数据，输出热点簇、趋势原因、风险、切入角度。"],
    ["TOPIC", "topic-generation", "输入热点、人设、历史内容和目标平台，输出候选选题。"],
    ["PERSONA", "persona-extraction", "输入历史内容和品牌资料，输出语气说明书和受众画像。"],
    ["CONTENT", "content-generation", "输入选题 brief、人设、平台和 CTA，输出对应平台内容。"],
    ["RISK", "risk-check", "检查事实风险、版权风险、平台风险、敏感表达和过度承诺。"],
    ["ANALYTICS", "analytics-report", "输入作品指标和评论摘要，输出复盘建议。"]
  ] as const;

  for (const [agentType, name, userPrompt] of prompts) {
    await prisma.agentPromptTemplate.upsert({
      where: {
        agentType_name_version: {
          agentType,
          name,
          version: 1
        }
      },
      update: {},
      create: {
        agentType,
        name,
        version: 1,
        systemPrompt: "ContentOS MVP 内置 prompt 模板。",
        userPrompt,
        outputSchema: {}
      }
    });
  }

  console.log(`Seeded workspace ${workspace.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
