import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getAgentConfig, updateAgentConfig, type AgentConfig } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:/api/agent-config`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const config = await getAgentConfig(email);
    return NextResponse.json({ config: config ?? {} });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to load agent config' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:/api/agent-config`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({})) as Partial<AgentConfig>;

  const config: AgentConfig = {};
  if (typeof body.systemPrompt === 'string' && body.systemPrompt.length <= 10_000) {
    config.systemPrompt = body.systemPrompt;
  }
  if (typeof body.name === 'string' && body.name.length <= 100) {
    config.name = body.name;
  }
  if (typeof body.personality === 'string' && body.personality.length <= 2_000) {
    config.personality = body.personality;
  }

  try {
    await updateAgentConfig(email, config);
    return NextResponse.json({ config });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to update agent config' }, { status: 500 });
  }
}
