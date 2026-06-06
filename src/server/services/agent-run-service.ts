import { AnalyticsAgent, ContentAgent, HotspotAgent, PersonaAgent, RiskCheckAgent, TopicAgent } from "@/server/agents";
import { getWorkspaceScoped, store } from "@/server/services/mock-store";
import type { AgentType } from "@/types/domain";

export function listAgentRuns(workspaceId: string) {
  return getWorkspaceScoped(store.agentRuns, workspaceId);
}

export function getAgentRun(workspaceId: string, id: string) {
  const run = store.agentRuns.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!run) {
    throw new Error("Agent 运行记录不存在");
  }
  return run;
}

export async function retryAgentRun(input: { workspaceId: string; userId: string; id: string }) {
  const run = getAgentRun(input.workspaceId, input.id);
  const agentType = run.agentType as AgentType;
  if (agentType === "HOTSPOT") {
    return new HotspotAgent(input.workspaceId, input.userId).run(run.input);
  }
  if (agentType === "TOPIC") {
    return new TopicAgent(input.workspaceId, input.userId).run(run.input);
  }
  if (agentType === "PERSONA") {
    return new PersonaAgent(input.workspaceId, input.userId).run(run.input);
  }
  if (agentType === "CONTENT") {
    return new ContentAgent(input.workspaceId, input.userId).run(run.input);
  }
  if (agentType === "ANALYTICS") {
    return new AnalyticsAgent(input.workspaceId, input.userId).run(run.input);
  }
  return new RiskCheckAgent(input.workspaceId, input.userId).run(run.input);
}
