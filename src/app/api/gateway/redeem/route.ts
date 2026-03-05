import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { getInstanceByUserId, getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code || code.length !== 32) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  try {
    const nowIso = new Date().toISOString();

    const { data: redeemed, error: updateError } = await getSupabase()
      .from('gateway_exchange_tokens')
      .update({ used_at: nowIso })
      .eq('code', code)
      .eq('user_id', email)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('code')
      .maybeSingle();

    if (updateError) {
      throw new Error(`Failed to redeem code: ${updateError.message}`);
    }

    if (!redeemed) {
      const { data: tokenRow, error: fetchError } = await getSupabase()
        .from('gateway_exchange_tokens')
        .select('user_id, used_at, expires_at')
        .eq('code', code)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch code: ${fetchError.message}`);
      }

      if (!tokenRow) {
        return NextResponse.json({ error: 'Code not found' }, { status: 404 });
      }

      if (tokenRow.user_id !== email) {
        return NextResponse.json({ error: 'Code not found' }, { status: 404 });
      }

      if (tokenRow.used_at) {
        return NextResponse.json({ error: 'Code already used' }, { status: 409 });
      }

      if (new Date(tokenRow.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Code expired' }, { status: 410 });
      }

      return NextResponse.json({ error: 'Unable to redeem code' }, { status: 400 });
    }

    const instance = await getInstanceByUserId(email);
    if (!instance?.gateway_url || !instance?.gateway_token) {
      return NextResponse.json({ error: 'Gateway not available' }, { status: 404 });
    }

    return NextResponse.json({
      gateway_url: instance.gateway_url,
      gateway_token: instance.gateway_token,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 });
  }
}
