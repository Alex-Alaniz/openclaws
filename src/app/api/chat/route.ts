import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:/api/chat`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const instance = await getInstanceByUserId(email);
  if (!instance || instance.status !== 'running' || !instance.gateway_url || !instance.gateway_token) {
    return NextResponse.json({ error: 'No running gateway instance' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { message?: string; conversationId?: string; model?: string };
  if (!body.message || typeof body.message !== 'string' || body.message.length > 32_000) {
    return NextResponse.json({ error: 'message is required and must be under 32000 characters' }, { status: 400 });
  }

  try {
    // Real OpenClaw exposes an OpenAI-compatible /v1/chat/completions endpoint
    const gatewayRes = await fetch(`${instance.gateway_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instance.gateway_token}`,
      },
      body: JSON.stringify({
        model: body.model ?? 'default',
        messages: [{ role: 'user', content: body.message }],
      }),
    });

    if (!gatewayRes.ok) {
      // 404/405 means the gateway doesn't expose a REST chat endpoint — fall back to direct Anthropic call
      if (gatewayRes.status === 404 || gatewayRes.status === 405) {
        return await callAnthropicDirect(body.message);
      }
      await gatewayRes.text().catch(() => {});
      return NextResponse.json({ error: 'Gateway error' }, { status: 502 });
    }

    // Extract reply from OpenAI-compatible response format
    const data = await gatewayRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const message = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ message });
  } catch (err) {
    Sentry.captureException(err);
    // Network error reaching gateway — try direct Anthropic call as fallback
    return await callAnthropicDirect(body.message);
  }
}

async function callAnthropicDirect(message: string): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Chat service temporarily unavailable' }, { status: 503 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI request failed. Please try again.' }, { status: 502 });
    }

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c: { type: string; text?: string }) => c.type === 'text')?.text ?? '';
    return NextResponse.json({ message: text });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'AI request failed. Please try again.' }, { status: 502 });
  }
}
