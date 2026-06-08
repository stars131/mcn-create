import { getAiProvider } from "@/server/ai/providers";
import type { AiProvider } from "@/server/ai/providers/ai-provider";
import { writeAuditLog } from "@/server/audit/audit-service";
import { nextId, store } from "@/server/services/mock-store";
import { recordAgentRunUsage } from "@/server/services/settings-service";
import type { AgentOutput, AgentRun, AgentStatus, AgentStep, AgentType } from "@/types/domain";
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
    const now = new Date().toISOString();
    const run: AgentRun = {
      id: nextId("run"),
      workspaceId: this.workspaceId,
      userId: this.userId,
      agentType: this.type,
      status: "RUNNING",
      input,
      model: this.aiProvider.id,
      costEstimate: 0,
      latencyMs: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    };
    store.agentRuns.unshift(run);

    const validateStep = this.startStep(run, "validate_input", input);
    let modelStep: AgentStep | undefined;
    let persistStep: AgentStep | undefined;

    try {
      const parsedInput = this.validateInput(input);
      run.input = parsedInput;
      this.finishStep(validateStep, "SUCCESS", { accepted: true });

      modelStep = this.startStep(run, "model_call", {
        agentType: this.type,
        model: this.aiProvider.id
      });
      const rawOutput = await this.callModel(parsedInput, run);
      this.finishStep(modelStep, "SUCCESS", rawOutput);

      const output = this.outputSchema.parse(rawOutput);
      persistStep = this.startStep(run, "persist_result", { output });
      await this.persistResult(output, run);
      this.finishStep(persistStep, "SUCCESS", { persisted: true });

      run.status = "SUCCESS";
      run.output = output;
      run.latencyMs = Date.now() - startedAt;
      run.finishedAt = new Date().toISOString();
      run.updatedAt = run.finishedAt;
      this.persistAgentOutput(run, "AgentOutput", run.id, output);
      recordAgentRunUsage(run);
      this.writeAuditLog(run, "success");
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知 Agent 错误";
      if (validateStep.status === "RUNNING") {
        this.finishStep(validateStep, "FAILED", undefined, message);
      }
      if (modelStep?.status === "RUNNING") {
        this.finishStep(modelStep, "FAILED", undefined, message);
      }
      if (persistStep?.status === "RUNNING") {
        this.finishStep(persistStep, "FAILED", undefined, message);
      }
      run.status = "FAILED";
      run.errorMessage = message;
      run.latencyMs = Date.now() - startedAt;
      run.finishedAt = new Date().toISOString();
      run.updatedAt = run.finishedAt;
      this.persistAgentOutput(run, "AgentError", run.id, { errorMessage: message });
      this.handleError(error, run);
      recordAgentRunUsage(run);
      this.writeAuditLog(run, "failed");
      throw error;
    }
  }

  abstract callModel(input: TInput, run: AgentRun): Promise<TOutput>;

  async persistResult(_output: TOutput, _run: AgentRun) {
    return;
  }

  protected startStep(run: AgentRun, name: string, input?: unknown) {
    const now = new Date().toISOString();
    const step: AgentStep = {
      id: nextId("agent_step"),
      workspaceId: this.workspaceId,
      agentRunId: run.id,
      name,
      status: "RUNNING",
      input,
      latencyMs: 0,
      createdAt: now,
      updatedAt: now
    };
    store.agentSteps.push(step);
    return step;
  }

  protected finishStep(step: AgentStep, status: AgentStatus, output?: unknown, errorMessage?: string) {
    step.status = status;
    step.output = output;
    step.errorMessage = errorMessage;
    step.latencyMs = Math.max(0, Date.now() - Date.parse(step.createdAt));
    step.updatedAt = new Date().toISOString();
  }

  protected persistAgentOutput(run: AgentRun, entityType: string, entityId: string | undefined, payload: unknown) {
    const now = new Date().toISOString();
    const output: AgentOutput = {
      id: nextId("agent_output"),
      workspaceId: this.workspaceId,
      agentRunId: run.id,
      entityType,
      entityId,
      payload,
      createdAt: now,
      updatedAt: now
    };
    store.agentOutputs.unshift(output);
    return output;
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
