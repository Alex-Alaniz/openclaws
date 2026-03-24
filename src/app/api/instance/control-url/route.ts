import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/instance/control-url
 *
 * Returns the full Control UI URL with the gateway token embedded in the hash
 * fragment. Enables seamless SaaS dashboard → Control UI navigation.
 *
 * Response: { url: "https://<instance>.openclaws.biz/#token=<gateway_token>" }
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/instance/control-url`, 20, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);

    if (!instance) {
      return NextResponse.json(
        { error: 'No instance found. Please provision an instance first.' },
        { status: 404 },
      );
    }

    if (instance.status !== 'running') {
      return NextResponse.json(
        { error: `Instance is not running (status: ${instance.status}).` },
        { status: 409 },
      );
    }

    if (!instance.gateway_url || !instance.gateway_token) {
      return NextResponse.json(
        { error: 'Instance is missing gateway configuration. Please re-provision.' },
        { status: 500 },
      );
    }

    const base = instance.gateway_url.replace(/\/$/, '');
    const controlUrl = `${base}/#token=${instance.gateway_token}`;

    return NextResponse.json({ url: controlUrl });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to generate Control UI URL' },
      { status: 500 },
    );
  }
}
