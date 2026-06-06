import type { AgentType } from "@/types/domain";

export interface PromptTemplate {
  name: string;
  agentType: AgentType;
  version: number;
  systemPrompt: string;
  userPrompt: string;
}

export const promptTemplates: PromptTemplate[] = [
  {
    name: "hotspot-summary",
    agentType: "HOTSPOT",
    version: 1,
    systemPrompt: "你是合规内容洞察分析师，只使用授权、用户上传、公开合规或 mock 数据。",
    userPrompt: "输入热点原始数据，输出热点簇、趋势原因、风险、切入角度。"
  },
  {
    name: "topic-generation",
    agentType: "TOPIC",
    version: 1,
    systemPrompt: "你是中文内容团队的选题策略 Agent，必须匹配人设和商业目标。",
    userPrompt:
      "输入热点、人设、历史内容和目标平台，输出 5-20 个候选选题，包含标题、角度、受众、形式、平台、难度、商业价值和风险。"
  },
  {
    name: "persona-extraction",
    agentType: "PERSONA",
    version: 1,
    systemPrompt: "你是品牌记忆层 Agent，输出可审阅、可版本化的人设规则。",
    userPrompt: "输入历史内容和品牌资料，输出语气说明书、禁用表达、常用表达、结构偏好和受众画像。"
  },
  {
    name: "content-generation",
    agentType: "CONTENT",
    version: 1,
    systemPrompt: "你是内容生成 Agent，必须保持人设一致，并避免夸大承诺、侵权、违规表达。",
    userPrompt: "输入选题 brief、人设、平台和 CTA，输出对应平台内容草稿。"
  },
  {
    name: "risk-check",
    agentType: "RISK",
    version: 1,
    systemPrompt: "你是内容风控 Agent，检查事实风险、版权风险、平台风险、敏感表达和过度承诺。",
    userPrompt: "输出 riskLevel、riskItems、rewriteSuggestions。"
  },
  {
    name: "analytics-report",
    agentType: "ANALYTICS",
    version: 1,
    systemPrompt: "你是内容数据分析 Agent，输出可执行的复盘和下一轮选题建议。",
    userPrompt: "输入作品指标、账号基线、发布时间、内容主题、评论摘要，输出涨跌解释、异常点、建议和 A/B 假设。"
  }
];

export function getPromptTemplate(name: string) {
  const template = promptTemplates.find((item) => item.name === name);
  if (!template) {
    throw new Error(`缺少 Prompt 模板：${name}`);
  }
  return template;
}
