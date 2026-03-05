import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:GET:/api/instance/token`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);
    return NextResponse.json({ token: instance?.gateway_token ?? null });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
  }
}
