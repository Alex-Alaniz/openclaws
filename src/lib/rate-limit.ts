import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Distributed rate limiter using Upstash Redis.
// Falls back to in-memory Map when Redis is unavailable (cold start, outage).

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limit: number;
  windowMs: number;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Cache Ratelimit instances per (limit, windowMs) combo
const limiterCache = new Map<string, Ratelimit>();

// In-memory fallback for when Redis is unavailable
const fallbackStore = new Map<string, number[]>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${limit}:${windowMs}`;
  let limiter = limiterCache.get(key);
  if (limiter) return limiter;

  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: 'openclaws:rl',
  });
  limiterCache.set(key, limiter);
  return limiter;
}

function fallbackRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const timestamps = fallbackStore.get(key) ?? [];
  const recent = timestamps.filter((t) => t > now - windowMs);
  if (recent.length >= limit) {
    fallbackStore.set(key, recent);
    return { success: false, remaining: 0, limit, windowMs };
  }
  recent.push(now);
  fallbackStore.set(key, recent);
  return { success: true, remaining: limit - recent.length, limit, windowMs };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return fallbackRateLimit(key, limit, windowMs);

  try {
    const res = await limiter.limit(key);
    return {
      success: res.success,
      remaining: res.remaining,
      limit,
      windowMs,
    };
  } catch {
    // Redis unavailable — fall back to in-memory
    return fallbackRateLimit(key, limit, windowMs);
  }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil(result.windowMs / 1000);
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}
