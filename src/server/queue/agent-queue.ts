export type QueueJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface QueueJob<TPayload, TResult = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  status: QueueJobStatus;
  result?: TResult;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  latencyMs?: number;
}

const jobs: QueueJob<unknown>[] = [];

export function enqueueAgentJob<TPayload>(name: string, payload: TPayload): QueueJob<TPayload> {
  const job: QueueJob<TPayload> = {
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    name,
    payload,
    status: "PENDING",
    attempts: 0,
    createdAt: new Date().toISOString()
  };
  jobs.push(job as QueueJob<unknown>);
  return job;
}

export async function processAgentJob<TPayload, TResult>(
  job: QueueJob<TPayload, TResult>,
  processor: (payload: TPayload, job: QueueJob<TPayload, TResult>) => Promise<TResult> | TResult
) {
  const startedAt = Date.now();
  job.status = "RUNNING";
  job.attempts += 1;
  job.startedAt = new Date().toISOString();

  try {
    const result = await processor(job.payload, job);
    job.result = result;
    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.latencyMs = Date.now() - startedAt;
    return result;
  } catch (error) {
    job.status = "FAILED";
    job.errorMessage = error instanceof Error ? error.message : "未知队列任务错误";
    job.failedAt = new Date().toISOString();
    job.latencyMs = Date.now() - startedAt;
    throw error;
  }
}

export async function enqueueAndProcessAgentJob<TPayload, TResult>(
  name: string,
  payload: TPayload,
  processor: (payload: TPayload, job: QueueJob<TPayload, TResult>) => Promise<TResult> | TResult
) {
  const job = enqueueAgentJob<TPayload>(name, payload) as QueueJob<TPayload, TResult>;
  const result = await processAgentJob(job, processor);
  return { job, result };
}

export function listQueuedJobs() {
  return [...jobs];
}

export function getQueuedJob(id: string) {
  return jobs.find((job) => job.id === id);
}
