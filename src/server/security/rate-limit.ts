export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitDecision {
  key: string;
  limited: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export const apiRateLimitPolicy: RateLimitPolicy = {
  windowMs: 60_000,
  maxRequests: 240
};

export function createRateLimitKey(input: { clientId: string; pathname: string }) {
  return `${input.clientId}:${input.pathname}`;
}

export function evaluateRateLimit(input: {
  buckets: Map<string, RateLimitBucket>;
  key: string;
  now?: number;
  policy?: RateLimitPolicy;
}): RateLimitDecision {
  const policy = input.policy ?? apiRateLimitPolicy;
  const now = input.now ?? Date.now();
  const current = input.buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + policy.windowMs;
    input.buckets.set(input.key, { count: 1, resetAt });
    return {
      key: input.key,
      limited: false,
      limit: policy.maxRequests,
      remaining: Math.max(0, policy.maxRequests - 1),
      resetAt,
      retryAfterSeconds: Math.ceil((resetAt - now) / 1000)
    };
  }

  current.count += 1;
  const limited = current.count > policy.maxRequests;

  return {
    key: input.key,
    limited,
    limit: policy.maxRequests,
    remaining: Math.max(0, policy.maxRequests - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
  };
}

export function getRateLimitHeaders(decision: RateLimitDecision) {
  const resetSeconds = Math.ceil(decision.resetAt / 1000).toString();
  const headers: Record<string, string> = {
    "RateLimit-Limit": decision.limit.toString(),
    "RateLimit-Remaining": decision.remaining.toString(),
    "RateLimit-Reset": resetSeconds,
    "X-RateLimit-Limit": decision.limit.toString(),
    "X-RateLimit-Remaining": decision.remaining.toString(),
    "X-RateLimit-Reset": resetSeconds
  };

  if (decision.limited) {
    headers["Retry-After"] = decision.retryAfterSeconds.toString();
  }

  return headers;
}

export function clearExpiredRateLimitBuckets(buckets: Map<string, RateLimitBucket>, now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
