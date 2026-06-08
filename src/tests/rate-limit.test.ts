import { describe, expect, it } from "vitest";
import {
  clearExpiredRateLimitBuckets,
  createRateLimitKey,
  evaluateRateLimit,
  getRateLimitHeaders,
  type RateLimitBucket
} from "@/server/security/rate-limit";

describe("rate limiting", () => {
  const policy = { windowMs: 1_000, maxRequests: 3 };

  it("creates a bucket for the first request", () => {
    const buckets = new Map<string, RateLimitBucket>();
    const decision = evaluateRateLimit({
      buckets,
      key: "client:/api/hotspots",
      now: 1_000,
      policy
    });

    expect(decision).toMatchObject({
      key: "client:/api/hotspots",
      limited: false,
      limit: 3,
      remaining: 2,
      resetAt: 2_000,
      retryAfterSeconds: 1
    });
    expect(buckets.get("client:/api/hotspots")).toEqual({ count: 1, resetAt: 2_000 });
  });

  it("allows the request that reaches the limit", () => {
    const buckets = new Map<string, RateLimitBucket>([["client:/api/hotspots", { count: 2, resetAt: 2_000 }]]);
    const decision = evaluateRateLimit({
      buckets,
      key: "client:/api/hotspots",
      now: 1_250,
      policy
    });

    expect(decision.limited).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(buckets.get("client:/api/hotspots")?.count).toBe(3);
  });

  it("limits requests over the threshold", () => {
    const buckets = new Map<string, RateLimitBucket>([["client:/api/hotspots", { count: 3, resetAt: 2_000 }]]);
    const decision = evaluateRateLimit({
      buckets,
      key: "client:/api/hotspots",
      now: 1_250,
      policy
    });

    expect(decision.limited).toBe(true);
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfterSeconds).toBe(1);
    expect(buckets.get("client:/api/hotspots")?.count).toBe(4);
  });

  it("resets an expired window", () => {
    const buckets = new Map<string, RateLimitBucket>([["client:/api/hotspots", { count: 3, resetAt: 2_000 }]]);
    const decision = evaluateRateLimit({
      buckets,
      key: "client:/api/hotspots",
      now: 2_000,
      policy
    });

    expect(decision.limited).toBe(false);
    expect(decision.remaining).toBe(2);
    expect(decision.resetAt).toBe(3_000);
    expect(buckets.get("client:/api/hotspots")).toEqual({ count: 1, resetAt: 3_000 });
  });

  it("clears expired buckets", () => {
    const buckets = new Map<string, RateLimitBucket>([
      ["expired", { count: 3, resetAt: 2_000 }],
      ["active", { count: 1, resetAt: 2_001 }]
    ]);

    clearExpiredRateLimitBuckets(buckets, 2_000);

    expect(buckets.has("expired")).toBe(false);
    expect(buckets.has("active")).toBe(true);
  });

  it("creates stable keys from client and path", () => {
    expect(createRateLimitKey({ clientId: "127.0.0.1", pathname: "/api/hotspots" })).toBe("127.0.0.1:/api/hotspots");
  });

  it("returns standard and legacy headers", () => {
    const allowedHeaders = getRateLimitHeaders({
      key: "client:/api/hotspots",
      limited: false,
      limit: 3,
      remaining: 1,
      resetAt: 2_000,
      retryAfterSeconds: 1
    });

    expect(allowedHeaders).toEqual({
      "RateLimit-Limit": "3",
      "RateLimit-Remaining": "1",
      "RateLimit-Reset": "2",
      "X-RateLimit-Limit": "3",
      "X-RateLimit-Remaining": "1",
      "X-RateLimit-Reset": "2"
    });

    const limitedHeaders = getRateLimitHeaders({
      key: "client:/api/hotspots",
      limited: true,
      limit: 3,
      remaining: 0,
      resetAt: 2_000,
      retryAfterSeconds: 1
    });

    expect(limitedHeaders["Retry-After"]).toBe("1");
  });
});
