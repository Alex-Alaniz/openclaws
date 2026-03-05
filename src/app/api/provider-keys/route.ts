import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { detectKeyType, storeProviderKey, listProviderKeys, deleteProviderKey, getDecryptedKey } from '@/lib/provider-keys';
import { getInstanceByUserId, getSupabase } from '@/lib/supabase';
import { updateMachineEnv } from '@/lib/fly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// List keys (metadata only)
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:GET:/api/provider-keys`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const keys = await listProviderKeys(email);
    return NextResponse.json({ keys });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 });
  }
}

// Save a key
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/provider-keys`, 20, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({})) as { key?: string };
  if (!body.key || typeof body.key !== 'string' || body.key.length > 500) {
    return NextResponse.json({ error: 'key is required and must be under 500 characters' }, { status: 400 });
  }

  const detected = detectKeyType(body.key);
  if (!detected) {
    return NextResponse.json({ error: 'Unrecognized key format. Supported: Anthropic (sk-ant-...), OpenAI (sk-...), Google (AIza...)' }, { status: 400 });
  }

  try {
    const keyInfo = await storeProviderKey(email, body.key);

    // Determine ai_mode
    const aiMode = detected.keyType === 'oauth_token' ? 'byoauth' : 'byokey';

    // Update instance ai_mode
    await getSupabase()
      .from('instances')
      .update({ ai_mode: aiMode, updated_at: new Date().toISOString() })
      .eq('user_id', email);

    // If running instance exists, push key to gateway
    const instance = await getInstanceByUserId(email);
    if (instance?.status === 'running' && instance.fly_app_name && instance.fly_machine_id) {
      const decrypted = await getDecryptedKey(email, detected.provider);
      if (decrypted) {
        const envUpdate: Record<string, string> = {};
        if (detected.provider === 'anthropic' && detected.keyType === 'oauth_token') {
          envUpdate.ANTHROPIC_OAUTH_TOKEN = decrypted.key;
        } else if (detected.provider === 'anthropic') {
          envUpdate.ANTHROPIC_API_KEY = decrypted.key;
        } else if (detected.provider === 'openai') {
          envUpdate.OPENAI_API_KEY = decrypted.key;
        }

        try {
          await updateMachineEnv(instance.fly_app_name, instance.fly_machine_id, envUpdate);
        } catch (err) {
          Sentry.captureException(err);
          // Non-fatal — key is stored, gateway update failed
        }
      }
    }

    return NextResponse.json({ key: keyInfo, aiMode });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to store key' }, { status: 500 });
  }
}

// Delete a key
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:DELETE:/api/provider-keys`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');
  if (!provider || !['anthropic', 'openai', 'google'].includes(provider)) {
    return NextResponse.json({ error: 'Valid provider query param required (anthropic, openai, google)' }, { status: 400 });
  }

  try {
    const deleted = await deleteProviderKey(email, provider as 'anthropic' | 'openai' | 'google');

    // Check if any keys remain — if none, revert to managed
    const remaining = await listProviderKeys(email);
    if (remaining.length === 0) {
      await getSupabase()
        .from('instances')
        .update({ ai_mode: 'managed', updated_at: new Date().toISOString() })
        .eq('user_id', email);
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}
