import type { AiCallResult, AiProvider, RerankItem } from "@/server/ai/providers/ai-provider";
import type { RiskLevel } from "@/types/domain";
import type { z } from "zod";

function usageFromText(text: string) {
  const prompt = Math.max(120, Math.round(text.length / 2));
  const completion = Math.max(80, Math.round(text.length / 4));
  return { prompt, completion, total: prompt + completion };
}

async function timed<T>(prompt: string, output: T): Promise<AiCallResult<T>> {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 20));
  return {
    output,
    model: "mock-contentos-v1",
    tokenUsage: usageFromText(prompt),
    costEstimate: 0,
    latencyMs: Date.now() - startedAt
  };
}

export const mockAiProvider: AiProvider = {
  id: "mock",
  async generateText({ prompt }) {
    return timed(prompt, `基于输入生成的内容建议：${prompt.slice(0, 120)}`);
  },
  async generateStructuredObject({ prompt, schema, seed }) {
    const parsed = schema.parse(seed);
    return timed(prompt, parsed as z.infer<typeof schema>);
  },
  async embedText({ text }) {
    const vector = Array.from({ length: 16 }, (_, index) => {
      const code = text.charCodeAt(index % Math.max(1, text.length)) || 1;
      return Number(((code % 97) / 97).toFixed(4));
    });
    return timed(text, vector);
  },
  async rerank({ query, items }) {
    const queryTerms = new Set(query.split(/\s+/).filter(Boolean));
    const ranked: RerankItem[] = [...items]
      .map((item) => ({
        ...item,
        score:
          item.score ??
          item.text
            .split(/\s+/)
            .filter((term) => queryTerms.has(term)).length +
            item.text.length / 1000
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return timed(query, ranked);
  },
  async summarize({ text }) {
    const summary = text.length > 120 ? `${text.slice(0, 118)}...` : text;
    return timed(text, summary);
  },
  async classifyRisk({ text }) {
    const highRiskWords = ["稳赚", "治愈", "保本", "绕过平台", "内部渠道"];
    const found = highRiskWords.filter((word) => text.includes(word));
    const riskLevel: RiskLevel = found.length > 1 ? "HIGH" : found.length === 1 ? "MEDIUM" : "LOW";
    const riskItems =
      found.length > 0
        ? found.map((word) => `包含需要人工复核的表达：${word}`)
        : ["未发现高风险承诺，建议补充事实来源和版权说明。"];
    const rewriteSuggestions =
      found.length > 0 ? ["改为可验证的描述，删除绝对化承诺。"] : ["保留人工审核入口。"];
    return timed(text, { riskLevel, riskItems, rewriteSuggestions });
  }
};
