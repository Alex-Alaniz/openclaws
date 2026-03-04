import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`${email}:GET:/api/gateway/open`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);

    if (!instance?.gateway_url || !instance?.gateway_token) {
      const baseUrl = new URL(req.url).origin;
      return NextResponse.redirect(`${baseUrl}/dashboard/settings`);
    }

    return NextResponse.redirect(`${instance.gateway_url}#token=${instance.gateway_token}`);
  } catch (error) {
    Sentry.captureException(error);
    const baseUrl = new URL(req.url).origin;
    return NextResponse.redirect(`${baseUrl}/dashboard/settings`);
  }
}
