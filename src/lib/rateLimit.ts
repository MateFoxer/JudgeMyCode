import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/limits";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashRateLimit =
  upstashUrl && upstashToken
    ? new Ratelimit({
        redis: new Redis({
          url: upstashUrl,
          token: upstashToken,
        }),
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_MAX_REQUESTS,
          `${Math.max(1, Math.floor(RATE_LIMIT_WINDOW_MS / 60_000))} m`
        ),
        analytics: true,
        prefix: "judge-my-code:review",
      })
    : null;

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < 60_000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  lastCleanupAt = now;
}

export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const forwardedIp = forwarded.split(",")[0]?.trim() || "";
  const cloudflareIp = request.headers.get("cf-connecting-ip") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = forwardedIp || cloudflareIp || realIp;

  if (ip) {
    return `ip:${ip}`;
  }

  const ua = request.headers.get("user-agent")?.slice(0, 120) || "unknown";
  return `ua:${ua}`;
}

function checkRateLimitInMemory(key: string): RateLimitDecision {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAtEpochSeconds: Math.ceil(resetAt / 1000),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
    retryAfterSeconds: 0,
  };
}

export async function checkRateLimit(key: string): Promise<RateLimitDecision> {
  if (!upstashRateLimit) {
    return checkRateLimitInMemory(key);
  }

  const result = await upstashRateLimit.limit(key);
  const now = Date.now();
  const retryAfterSeconds = result.success
    ? 0
    : Math.max(1, Math.ceil((result.reset - now) / 1000));

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    resetAtEpochSeconds: Math.ceil(result.reset / 1000),
    retryAfterSeconds,
  };
}