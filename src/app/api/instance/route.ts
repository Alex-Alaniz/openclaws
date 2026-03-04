import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  getSupabase,
  getInstanceByUserId,
  updateInstanceStatus,
  deleteInstanceByUserId,
} from '@/lib/supabase';
import { provisionGateway, destroyGateway } from '@/lib/fly';
import { listProviderKeys, getDecryptedKey } from '@/lib/provider-keys';
import { getSubscriptionStatus } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const instance = await getInstanceByUserId(email);
    if (instance) {
      // Strip sensitive fields from response
      const { setup_password, gateway_token, ...safe } = instance;
      return NextResponse.json({ instance: safe });
    }
    return NextResponse.json({ instance: null });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to fetch instance' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`${email}:POST:/api/instance`, 3, 3_600_000);
  if (!rl.success) return rateLimitResponse(rl);

  // Verify active subscription before allowing provisioning
  try {
    const sub = await getSubscriptionStatus(email);
    if (!sub.active) {
      return NextResponse.json(
        { error: 'Active subscription required. Please upgrade to OpenClaws Pro.' },
        { status: 403 },
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    // Allow provisioning if Stripe is unreachable — webhook already gates the primary flow
  }

  // Parse optional region
  const body = await req.json().catch(() => ({})) as { region?: string };
  const region = typeof body.region === 'string' ? body.region.trim() : undefined;

  // Atomic provisioning claim — prevents race conditions
  // Step 1: Try conditional update (re-provision only if errored/stopped)
  try {
    const { data: reclaimed } = await getSupabase()
      .from('instances')
      .update({ status: 'provisioning', error_message: null, updated_at: new Date().toISOString() })
      .eq('user_id', email)
      .in('status', ['error', 'stopped'])
      .select('*')
      .maybeSingle();

    if (!reclaimed) {
      // No row was updated — either no row exists or it's running/provisioning
      // Step 2: Try insert (unique constraint on user_id prevents duplicates)
      const { error: insertErr } = await getSupabase()
        .from('instances')
        .insert({
          user_id: email,
          user_email: email,
          status: 'provisioning',
          updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        // Row exists and is running/provisioning → 409
        const existing = await getInstanceByUserId(email);
        if (existing) {
          const { setup_password, gateway_token, ...safe } = existing;
          return NextResponse.json(
            { error: 'Instance already exists', instance: safe },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: 'Instance already exists' }, { status: 409 });
      }
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to initiate provisioning' }, { status: 500 });
  }

  // Fetch user's provider keys to pass to gateway
  let anthropicApiKey: string | undefined;
  let anthropicOauthToken: string | undefined;
  let openaiApiKey: string | undefined;

  try {
    const keys = await listProviderKeys(email);
    for (const keyInfo of keys) {
      const decrypted = await getDecryptedKey(email, keyInfo.provider);
      if (!decrypted) continue;

      if (keyInfo.provider === 'anthropic' && keyInfo.keyType === 'oauth_token') {
        anthropicOauthToken = decrypted.key;
      } else if (keyInfo.provider === 'anthropic') {
        anthropicApiKey = decrypted.key;
      } else if (keyInfo.provider === 'openai') {
        openaiApiKey = decrypted.key;
      }
    }
  } catch {
    // Non-fatal — provision without user keys
  }

  // Provision on Fly.io
  try {
    const result = await provisionGateway({
      userId: email,
      userEmail: email,
      region,
      anthropicApiKey,
      anthropicOauthToken,
      openaiApiKey,
    });

    await updateInstanceStatus(email, 'running', {
      fly_app_name: result.appName,
      fly_machine_id: result.machineId,
      fly_volume_id: result.volumeId,
      gateway_url: result.gatewayUrl,
      gateway_token: result.gatewayToken,
      setup_password: '',
    });

    const instance = await getInstanceByUserId(email);
    if (instance) {
      const { setup_password: _sp, gateway_token: _gt, ...safe } = instance;
      return NextResponse.json({ instance: safe });
    }
    return NextResponse.json({ instance: null });
  } catch (error) {
    Sentry.captureException(error);
    const internalMessage = error instanceof Error ? error.message : 'Provisioning failed';
    await updateInstanceStatus(email, 'error', { error_message: internalMessage }).catch(() => {});
    return NextResponse.json({ error: 'Gateway provisioning failed. Please try again.' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`${email}:DELETE:/api/instance`, 5, 3_600_000);
  if (!rl.success) return rateLimitResponse(rl);

  const instance = await getInstanceByUserId(email);
  if (!instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 });
  }

  // Mark as deleting
  try {
    await updateInstanceStatus(email, 'deleting');
  } catch {
    // Continue with destruction
  }

  // Destroy Fly resources
  try {
    if (instance.fly_app_name && instance.fly_machine_id && instance.fly_volume_id) {
      await destroyGateway({
        appName: instance.fly_app_name,
        machineId: instance.fly_machine_id,
        volumeId: instance.fly_volume_id,
      });
    }
  } catch (error) {
    Sentry.captureException(error);
    const internalMessage = error instanceof Error ? error.message : 'Destruction failed';
    await updateInstanceStatus(email, 'error', { error_message: internalMessage }).catch(() => {});
    return NextResponse.json({ error: 'Gateway destruction failed. Please try again.' }, { status: 500 });
  }

  // Remove DB row
  try {
    await deleteInstanceByUserId(email);
  } catch (error) {
    Sentry.captureException(error);
  }

  return NextResponse.json({ success: true });
}
