import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { approveLatestPairingRequest } from '@/lib/fly';
import { getInstanceByUserId } from '@/lib/supabase';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/gateway/approve-pairing`, 5, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const instance = await getInstanceByUserId(email);
  if (!instance?.fly_app_name || !instance?.fly_machine_id || !instance?.gateway_token) {
    return NextResponse.json({ error: 'No running gateway instance' }, { status: 404 });
  }

  const flyToken = process.env.FLY_API_TOKEN?.trim();
  if (!flyToken) {
    return NextResponse.json({ error: 'Infrastructure not configured' }, { status: 500 });
  }

  try {
    const result = await approveLatestPairingRequest(
      instance.fly_app_name,
      instance.fly_machine_id,
      instance.gateway_token,
    );

    if (result.reason === 'machine_not_running') {
      return NextResponse.json(
        {
          approved: false,
          error: 'Gateway is not currently running. Open your agent first, then try pairing again.',
          machineState: result.machineState,
        },
        { status: 409 },
      );
    }

    if (result.reason === 'no_pending') {
      return NextResponse.json({ approved: false, message: 'No pending pairing requests' });
    }

    return NextResponse.json({ approved: true });
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        app: instance.fly_app_name,
        machineId: instance.fly_machine_id,
      },
    });
    return NextResponse.json({ error: 'Failed to approve pairing' }, { status: 500 });
  }
}
