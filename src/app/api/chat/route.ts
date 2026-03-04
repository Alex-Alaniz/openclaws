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

  const rl = rateLimit(`${email}:/api/chat`, 30, 60_000);
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
      // 404/405 means the endpoint isn't enabled on this gateway yet
      if (gatewayRes.status === 404 || gatewayRes.status === 405) {
        return NextResponse.json({
          message: 'Quick chat is not available yet. Click "Open your OpenClaw" above for the full experience — browser automation, skills, channels, and more.',
        });
      }
      const err = await gatewayRes.json().catch(() => ({ error: 'Gateway error' })) as { error?: string };
      return NextResponse.json({ error: err.error ?? 'Gateway error' }, { status: gatewayRes.status });
    }

    // Extract reply from OpenAI-compatible response format
    const data = await gatewayRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const message = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ message });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Failed to reach gateway' }, { status: 502 });
  }
}
