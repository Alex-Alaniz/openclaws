import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';
import {
  getGatewayChannels,
  isFlyMachineNotRunningError,
  removeGatewayChannel,
  setGatewayChannel,
} from '@/lib/fly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Supported channel types and their required fields */
const CHANNEL_SCHEMA: Record<string, { required: string[]; optional: string[] }> = {
  telegram: { required: ['token'], optional: [] },
  whatsapp: { required: [], optional: ['phoneNumber'] },
  discord: { required: ['token'], optional: ['guildId'] },
};

/**
 * GET /api/channels — list configured channels on the user's gateway
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:GET:/api/channels`, 20, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const instance = await getInstanceByUserId(email);
    if (!instance || instance.status !== 'running' || !instance.fly_app_name || !instance.fly_machine_id) {
      return NextResponse.json({ channels: {}, available: Object.keys(CHANNEL_SCHEMA) });
    }

    const channels = await getGatewayChannels(instance.fly_app_name, instance.fly_machine_id);

    // Redact sensitive fields (tokens) — only return whether they're configured
    const safe: Record<string, { configured: boolean; type: string }> = {};
    for (const [name, config] of Object.entries(channels)) {
      const cfg = config as Record<string, unknown> | null;
      safe[name] = {
        configured: cfg !== null && typeof cfg === 'object' && Object.keys(cfg).length > 0,
        type: name,
      };
    }

    return NextResponse.json({ channels: safe, available: Object.keys(CHANNEL_SCHEMA) });
  } catch (error) {
    if (isFlyMachineNotRunningError(error)) {
      return NextResponse.json({ channels: {}, available: Object.keys(CHANNEL_SCHEMA) });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

/**
 * POST /api/channels — configure a channel on the user's gateway
 * Body: { channel: "telegram", config: { token: "..." } }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:POST:/api/channels`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = (await req.json().catch(() => ({}))) as {
    channel?: string;
    config?: Record<string, unknown>;
  };

  const channelName = body.channel?.trim().toLowerCase();
  if (!channelName || !CHANNEL_SCHEMA[channelName]) {
    return NextResponse.json(
      { error: `Invalid channel. Supported: ${Object.keys(CHANNEL_SCHEMA).join(', ')}` },
      { status: 400 },
    );
  }

  const schema = CHANNEL_SCHEMA[channelName];
  const config = body.config ?? {};

  // Validate required fields
  for (const field of schema.required) {
    const val = config[field];
    if (!val || (typeof val === 'string' && !val.trim())) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  // Validate Telegram token format
  if (channelName === 'telegram') {
    const token = String(config.token).trim();
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid Telegram bot token format. Expected: 1234567890:ABCdef...' },
        { status: 400 },
      );
    }
  }

  try {
    const instance = await getInstanceByUserId(email);
    if (!instance || instance.status !== 'running' || !instance.fly_app_name || !instance.fly_machine_id) {
      return NextResponse.json(
        { error: 'Gateway must be running to configure channels' },
        { status: 400 },
      );
    }

    await setGatewayChannel(instance.fly_app_name, instance.fly_machine_id, channelName, config);

    return NextResponse.json({ success: true, channel: channelName });
  } catch (error) {
    if (isFlyMachineNotRunningError(error)) {
      return NextResponse.json({ error: 'Gateway must be running to configure channels' }, { status: 409 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to configure channel' }, { status: 500 });
  }
}

/**
 * DELETE /api/channels?channel=telegram — remove a channel configuration
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:DELETE:/api/channels`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const url = new URL(req.url);
  const channelName = url.searchParams.get('channel')?.trim().toLowerCase();

  if (!channelName) {
    return NextResponse.json({ error: 'Missing channel parameter' }, { status: 400 });
  }

  try {
    const instance = await getInstanceByUserId(email);
    if (!instance || instance.status !== 'running' || !instance.fly_app_name || !instance.fly_machine_id) {
      return NextResponse.json(
        { error: 'Gateway must be running to configure channels' },
        { status: 400 },
      );
    }

    await removeGatewayChannel(instance.fly_app_name, instance.fly_machine_id, channelName);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isFlyMachineNotRunningError(error)) {
      return NextResponse.json({ error: 'Gateway must be running to configure channels' }, { status: 409 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to remove channel' }, { status: 500 });
  }
}
