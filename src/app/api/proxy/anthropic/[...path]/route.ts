import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { verifyProxyToken } from '@/lib/proxy-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM = 'https://api.anthropic.com';

/**
 * Proxy for Anthropic API calls from managed-mode gateways.
 * Gateway sets ANTHROPIC_BASE_URL to point here instead of api.anthropic.com.
 * The proxy validates the per-user token, injects the platform API key,
 * and streams the response back.
 */
async function handler(req: NextRequest) {
  // Extract and verify proxy token
  const authHeader = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authentication' }, { status: 401 });
  }

  // Check if this is a proxy token (has 4 dot-separated parts) or a raw API key
  const parts = authHeader.split('.');
  if (parts.length !== 4) {
    return NextResponse.json({ error: 'Invalid proxy token format' }, { status: 401 });
  }

  const claims = verifyProxyToken(authHeader);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid or expired proxy token' }, { status: 401 });
  }

  if (claims.scope !== 'anthropic') {
    return NextResponse.json({ error: 'Token scope mismatch' }, { status: 403 });
  }

  // Per-user rate limiting: 60 requests/minute for managed mode
  const rl = await rateLimit(`proxy:anthropic:${claims.userId}`, 60, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const platformKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!platformKey) {
    return NextResponse.json({ error: 'Proxy not configured' }, { status: 503 });
  }

  // Build upstream URL — strip /api/proxy/anthropic prefix
  const pathname = req.nextUrl.pathname.replace(/^\/api\/proxy\/anthropic/, '');
  const upstreamUrl = `${UPSTREAM}${pathname}${req.nextUrl.search}`;

  try {
    // Forward request to Anthropic with platform key
    const upstreamHeaders = new Headers();
    upstreamHeaders.set('x-api-key', platformKey);
    upstreamHeaders.set('content-type', req.headers.get('content-type') ?? 'application/json');
    upstreamHeaders.set('anthropic-version', req.headers.get('anthropic-version') ?? '2023-06-01');

    // Preserve anthropic-beta header if present
    const beta = req.headers.get('anthropic-beta');
    if (beta) upstreamHeaders.set('anthropic-beta', beta);

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-expect-error -- duplex needed for streaming request bodies
      duplex: 'half',
    });

    // Stream response back to gateway
    const responseHeaders = new Headers();
    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    Sentry.captureException(error, { extra: { userId: claims.userId, pathname } });
    return NextResponse.json({ error: 'Proxy upstream error' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
