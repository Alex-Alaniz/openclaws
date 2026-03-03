import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { detectKeyType, storeProviderKey, listProviderKeys, deleteProviderKey, getDecryptedKey } from '@/lib/provider-keys';
import { getInstanceByUserId, getSupabase } from '@/lib/supabase';
import { updateMachineEnv } from '@/lib/fly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUserEmail(session: { user?: { email?: string | null } }): string | null {
  return session.user?.email?.trim().toLowerCase() ?? null;
}

// List keys (metadata only)
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await listProviderKeys(email);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Failed to list provider keys:', error);
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

  const body = await req.json().catch(() => ({})) as { key?: string };
  if (!body.key || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
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
          envUpdate.ANTHROPIC_AUTH_TOKEN = decrypted.key;
        } else if (detected.provider === 'anthropic') {
          envUpdate.ANTHROPIC_API_KEY = decrypted.key;
        } else if (detected.provider === 'openai') {
          envUpdate.OPENAI_API_KEY = decrypted.key;
        }

        try {
          await updateMachineEnv(instance.fly_app_name, instance.fly_machine_id, envUpdate);
        } catch (err) {
          console.error('Failed to push key to gateway:', err);
          // Non-fatal — key is stored, gateway update failed
        }
      }
    }

    return NextResponse.json({ key: keyInfo, aiMode });
  } catch (error) {
    console.error('Failed to store provider key:', error);
    const message = error instanceof Error ? error.message : 'Failed to store key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete a key
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    console.error('Failed to delete provider key:', error);
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}
