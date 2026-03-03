import { NextResponse } from 'next/server';

// In-memory sliding window rate limiter.
// Works within a single Vercel serverless isolate — provides protection
// against rapid-fire abuse from warm connections. Upgrade path: swap
// this Map for @upstash/ratelimit + Redis for cross-isolate persistence.

const store = new Map<string, number[]>();

// Clean up expired entries every 60s to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, timestamps] of store) {
    // Remove entries older than 1 hour (max window we use)
    const cutoff = now - 3_600_000;
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      store.delete(key);
    } else {
      store.set(key, filtered);
    }
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limit: number;
  windowMs: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const timestamps = store.get(key) ?? [];
  const windowStart = now - windowMs;
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    store.set(key, recent);
    return { success: false, remaining: 0, limit, windowMs };
  }

  recent.push(now);
  store.set(key, recent);
  return { success: true, remaining: limit - recent.length, limit, windowMs };
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
