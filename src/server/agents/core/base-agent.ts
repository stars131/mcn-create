import { getAiProvider } from "@/server/ai/providers";
import type { AiProvider } from "@/server/ai/providers/ai-provider";
import { writeAuditLog } from "@/server/audit/audit-service";
import { nextId, store } from "@/server/services/mock-store";
import type { AgentRun, AgentType } from "@/types/domain";
import type { z } from "zod";

export interface AgentContext {
  workspaceId: string;
  userId: string;
}

export abstract class BaseAgent<TInput, TOutput> {
  readonly id: string;
  protected readonly aiProvider: AiProvider;

  constructor(
    readonly type: AgentType,
    readonly workspaceId: string,
    readonly userId: string,
    readonly inputSchema: z.ZodTypeAny,
    readonly outputSchema: z.ZodType<TOutput>
  ) {
    this.id = nextId("agent");
    this.aiProvider = getAiProvider();
  }

  validateInput(input: unknown): TInput {
    return this.inputSchema.parse(input) as TInput;
  }

  async run(input: unknown): Promise<TOutput> {
    const startedAt = Date.now();
    const parsedInput = this.validateInput(input);
    const run: AgentRun = {
      id: nextId("run"),
      workspaceId: this.workspaceId,
      userId: this.userId,
      agentType: this.type,
      status: "RUNNING",
      input: parsedInput,
      model: this.aiProvider.id,
      costEstimate: 0,
      latencyMs: 0,
      createdAt: new Date().toISOString()
    };
    store.agentRuns.unshift(run);

    try {
      const rawOutput = await this.callModel(parsedInput, run);
      const output = this.outputSchema.parse(rawOutput);
      await this.persistResult(output, run);
      run.status = "SUCCESS";
      run.output = output;
      run.latencyMs = Date.now() - startedAt;
      this.writeAuditLog(run, "success");
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知 Agent 错误";
      run.status = "FAILED";
      run.errorMessage = message;
      run.latencyMs = Date.now() - startedAt;
      this.handleError(error, run);
      this.writeAuditLog(run, "failed");
      throw error;
    }
  }

  abstract callModel(input: TInput, run: AgentRun): Promise<TOutput>;

  async persistResult(_output: TOutput, _run: AgentRun) {
    return;
  }

  writeAuditLog(run: AgentRun, status: "success" | "failed") {
    writeAuditLog({
      workspaceId: this.workspaceId,
      userId: this.userId,
      action: `agent.${this.type.toLowerCase()}.${status}`,
      entityType: "AgentRun",
      entityId: run.id,
      summary: `${this.type} Agent ${status === "success" ? "运行成功" : "运行失败"}`,
      metadata: {
        status: run.status,
        latencyMs: run.latencyMs,
        errorMessage: run.errorMessage
      }
    });
  }

  handleError(_error: unknown, _run: AgentRun) {
    return;
  }
}
