import type { AgentType, RiskLevel } from "@/types/domain";
import type { z } from "zod";

export interface AiCallContext {
  workspaceId: string;
  userId: string;
  agentType: AgentType;
  promptName: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface AiCallResult<T> {
  output: T;
  model: string;
  tokenUsage: TokenUsage;
  costEstimate: number;
  latencyMs: number;
}

export interface RerankItem {
  id: string;
  text: string;
  score?: number;
}

export interface AiProvider {
  id: string;
  generateText(input: { prompt: string; context: AiCallContext }): Promise<AiCallResult<string>>;
  generateStructuredObject<TSchema extends z.ZodTypeAny>(input: {
    prompt: string;
    schema: TSchema;
    context: AiCallContext;
    seed?: unknown;
  }): Promise<AiCallResult<z.infer<TSchema>>>;
  embedText(input: { text: string; context: AiCallContext }): Promise<AiCallResult<number[]>>;
  rerank(input: { query: string; items: RerankItem[]; context: AiCallContext }): Promise<AiCallResult<RerankItem[]>>;
  summarize(input: { text: string; context: AiCallContext }): Promise<AiCallResult<string>>;
  classifyRisk(input: {
    text: string;
    context: AiCallContext;
  }): Promise<AiCallResult<{ riskLevel: RiskLevel; riskItems: string[]; rewriteSuggestions: string[] }>>;
}
