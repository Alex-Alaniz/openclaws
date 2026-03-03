import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSubscriptionStatus } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`${email}:/api/subscription`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const sub = await getSubscriptionStatus(email);
    return NextResponse.json({
      active: sub.active,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
  }
}
