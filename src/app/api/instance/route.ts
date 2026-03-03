import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  getInstanceByUserId,
  upsertInstance,
  updateInstanceStatus,
  deleteInstanceByUserId,
} from '@/lib/supabase';
import { provisionGateway, destroyGateway } from '@/lib/fly';
import { listProviderKeys, getDecryptedKey } from '@/lib/provider-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUserEmail(session: { user?: { email?: string | null } }): string | null {
  return session.user?.email?.trim().toLowerCase() ?? null;
}

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
      const { setup_password, ...safe } = instance;
      return NextResponse.json({ instance: safe });
    }
    return NextResponse.json({ instance: null });
  } catch (error) {
    console.error('Failed to fetch instance:', error);
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

  // Check for existing instance
  try {
    const existing = await getInstanceByUserId(email);
    if (existing && (existing.status === 'running' || existing.status === 'provisioning')) {
      const { setup_password, ...safe } = existing;
      return NextResponse.json(
        { error: 'Instance already exists', instance: safe },
        { status: 409 },
      );
    }
  } catch {
    // Continue with provisioning if lookup fails
  }

  // Parse optional region
  const body = await req.json().catch(() => ({})) as { region?: string };
  const region = typeof body.region === 'string' ? body.region.trim() : undefined;

  // Create initial DB row
  try {
    await upsertInstance({
      user_id: email,
      user_email: email,
      status: 'provisioning',
      error_message: null,
    });
  } catch (error) {
    console.error('Failed to create instance record:', error);
    return NextResponse.json({ error: 'Failed to initiate provisioning' }, { status: 500 });
  }

  // Fetch user's provider keys to pass to gateway
  let anthropicApiKey: string | undefined;
  let anthropicAuthToken: string | undefined;
  let openaiApiKey: string | undefined;

  try {
    const keys = await listProviderKeys(email);
    for (const keyInfo of keys) {
      const decrypted = await getDecryptedKey(email, keyInfo.provider);
      if (!decrypted) continue;

      if (keyInfo.provider === 'anthropic' && keyInfo.keyType === 'oauth_token') {
        anthropicAuthToken = decrypted.key;
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
      anthropicAuthToken,
      openaiApiKey,
    });

    await updateInstanceStatus(email, 'running', {
      fly_app_name: result.appName,
      fly_machine_id: result.machineId,
      fly_volume_id: result.volumeId,
      gateway_url: result.gatewayUrl,
      gateway_token: result.gatewayToken,
      setup_password: result.setupPassword,
    });

    const instance = await getInstanceByUserId(email);
    if (instance) {
      const { setup_password: _sp, ...safe } = instance;
      return NextResponse.json({ instance: safe });
    }
    return NextResponse.json({ instance: null });
  } catch (error) {
    console.error('Gateway provisioning failed:', error);
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
    console.error('Gateway destruction failed:', error);
    const internalMessage = error instanceof Error ? error.message : 'Destruction failed';
    await updateInstanceStatus(email, 'error', { error_message: internalMessage }).catch(() => {});
    return NextResponse.json({ error: 'Gateway destruction failed. Please try again.' }, { status: 500 });
  }

  // Remove DB row
  try {
    await deleteInstanceByUserId(email);
  } catch (error) {
    console.error('Failed to delete instance record:', error);
  }

  return NextResponse.json({ success: true });
}
