import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validateProviderKey } from '@/lib/provider-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`${email}:/api/provider-keys/validate`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({})) as { provider?: string };
  const provider = body.provider;
  if (!provider || !['anthropic', 'openai', 'google'].includes(provider)) {
    return NextResponse.json({ error: 'Valid provider required (anthropic, openai, google)' }, { status: 400 });
  }

  try {
    const result = await validateProviderKey(email, provider as 'anthropic' | 'openai' | 'google');
    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}
