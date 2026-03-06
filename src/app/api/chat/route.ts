import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getAgentConfig } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_SYSTEM_PROMPT = `You are the user's AI assistant powered by OpenClaws. You help with coding, automation, research, and general tasks. Be concise, helpful, and direct. Match the user's energy — if they're casual, be casual. If they're technical, be technical.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:/api/chat`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({})) as { message?: string };
  if (!body.message || typeof body.message !== 'string' || body.message.length > 32_000) {
    return NextResponse.json({ error: 'message is required and must be under 32000 characters' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Chat service temporarily unavailable' }, { status: 503 });
  }

  // Load the agent's soul — system prompt + personality from Supabase
  const agentConfig = await getAgentConfig(email).catch(() => null);
  const systemPrompt = agentConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: body.message }],
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
