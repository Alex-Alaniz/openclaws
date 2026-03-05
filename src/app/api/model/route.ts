import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId, getSupabase } from '@/lib/supabase';
import { updateMachineEnv } from '@/lib/fly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get current model + ai_mode
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:GET:/api/model`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);
    return NextResponse.json({
      selectedModel: instance?.selected_model ?? 'claude-sonnet-4-6',
      aiMode: instance?.ai_mode ?? 'managed',
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to get model' }, { status: 500 });
  }
}

// Set model selection
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/model`, 20, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const ALLOWED_MODELS = [
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'gpt-4o',
  ];

  const body = await req.json().catch(() => ({})) as { model?: string };
  if (!body.model || typeof body.model !== 'string' || !ALLOWED_MODELS.includes(body.model)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  try {
    // Update in DB
    await getSupabase()
      .from('instances')
      .update({ selected_model: body.model, updated_at: new Date().toISOString() })
      .eq('user_id', email);

    // Push to running gateway
    const instance = await getInstanceByUserId(email);
    if (instance?.status === 'running' && instance.fly_app_name && instance.fly_machine_id) {
      try {
        await updateMachineEnv(instance.fly_app_name, instance.fly_machine_id, {
          SELECTED_MODEL: body.model,
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    }

    return NextResponse.json({ selectedModel: body.model });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to set model' }, { status: 500 });
  }
}
