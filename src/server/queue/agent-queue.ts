export interface QueueJob<T> {
  id: string;
  name: string;
  payload: T;
  createdAt: string;
}

const jobs: QueueJob<unknown>[] = [];

export function enqueueAgentJob<T>(name: string, payload: T): QueueJob<T> {
  const job: QueueJob<T> = {
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    name,
    payload,
    createdAt: new Date().toISOString()
  };
  jobs.push(job as QueueJob<unknown>);
  return job;
}

export function listQueuedJobs() {
  return [...jobs];
}
