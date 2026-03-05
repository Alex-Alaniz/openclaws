import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { randomBytes } from 'crypto';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId, getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/gateway/exchange-token`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const code = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const { error } = await getSupabase()
      .from('gateway_exchange_tokens')
      .insert({
        code,
        instance_id: instance.id ?? email,
        user_id: email,
        expires_at: expiresAt,
      });

    if (error) {
      throw new Error(`Failed to create exchange token: ${error.message}`);
    }

    return NextResponse.json({ code });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to create exchange token' }, { status: 500 });
  }
}
