import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { getInstanceByUserId } from '@/lib/supabase';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FLY_API_BASE = 'https://api.machines.dev/v1';

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
    const authHeader = flyToken.startsWith('FlyV1 ') ? flyToken : `Bearer ${flyToken}`;

    // Exec openclaw devices approve --latest on the user's Fly machine
    const execRes = await fetch(
      `${FLY_API_BASE}/apps/${instance.fly_app_name}/machines/${instance.fly_machine_id}/exec`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: [
            'sh', '-c',
            `OPENCLAW_GATEWAY_PORT=3000 OPENCLAW_GATEWAY_TOKEN=${instance.gateway_token} openclaw devices approve --latest --json`,
          ],
          timeout: 10,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!execRes.ok) {
      const errText = await execRes.text().catch(() => '');
      if (execRes.status === 412) {
        return NextResponse.json({ error: 'Gateway is not running' }, { status: 409 });
      }
      Sentry.captureMessage('Fly exec failed for approve-pairing', {
        level: 'warning',
        extra: { status: execRes.status, body: errText, app: instance.fly_app_name },
      });
      return NextResponse.json({ error: 'Failed to reach gateway' }, { status: 502 });
    }

    const result = await execRes.json().catch(() => ({})) as { stdout?: string; stderr?: string; exit_code?: number };

    if (result.exit_code !== 0) {
      // No pending requests is not an error from the user's perspective
      const stderr = result.stderr ?? '';
      if (stderr.includes('no pending') || stderr.includes('No pending')) {
        return NextResponse.json({ approved: false, message: 'No pending pairing requests' });
      }
      return NextResponse.json({ error: 'No pending pairing requests to approve' }, { status: 404 });
    }

    return NextResponse.json({ approved: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to approve pairing' }, { status: 500 });
  }
}
