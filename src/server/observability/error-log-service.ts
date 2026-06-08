import { store } from "@/server/services/mock-store";
import type { ErrorLog } from "@/types/domain";

export type PublicErrorLog = Omit<ErrorLog, "stack"> & {
  hasStack: boolean;
};

export interface RecordErrorLogInput {
  workspaceId?: string;
  userId?: string;
  requestId?: string;
  route: string;
  method: string;
  status: number;
  publicMessage: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export function recordErrorLog(input: RecordErrorLogInput) {
  const log: ErrorLog = {
    id: `error_${crypto.randomUUID()}`,
    requestId: input.requestId ?? crypto.randomUUID(),
    route: input.route,
    method: input.method,
    status: input.status,
    publicMessage: input.publicMessage,
    errorName: getErrorName(input.error),
    errorMessage: getErrorMessage(input.error),
    stack: input.error instanceof Error ? input.error.stack : undefined,
    workspaceId: input.workspaceId,
    userId: input.userId,
    metadata: input.metadata,
    createdAt: new Date().toISOString()
  };

  store.errorLogs.unshift(log);
  return log;
}

export function listErrorLogs(workspaceId?: string) {
  return store.errorLogs.filter((log) => !workspaceId || !log.workspaceId || log.workspaceId === workspaceId);
}

function publicErrorLog(log: ErrorLog): PublicErrorLog {
  const { stack: _stack, ...safeLog } = log;
  return {
    ...safeLog,
    hasStack: Boolean(_stack)
  };
}

export function listPublicErrorLogs(workspaceId?: string, limit = 20) {
  return listErrorLogs(workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(publicErrorLog);
}
