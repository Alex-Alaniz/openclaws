import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import {
  getInstanceByUserId,
  upsertInstance,
  updateInstanceStatus,
  deleteInstanceByUserId,
} from '@/lib/supabase';
import { provisionGateway, destroyGateway } from '@/lib/fly';

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
    return NextResponse.json({ instance });
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

  // Check for existing instance
  try {
    const existing = await getInstanceByUserId(email);
    if (existing && (existing.status === 'running' || existing.status === 'provisioning')) {
      return NextResponse.json(
        { error: 'Instance already exists', instance: existing },
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

  // Provision on Fly.io
  try {
    const result = await provisionGateway({
      userId: email,
      userEmail: email,
      region,
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
    return NextResponse.json({ instance });
  } catch (error) {
    console.error('Gateway provisioning failed:', error);
    const message = error instanceof Error ? error.message : 'Provisioning failed';
    await updateInstanceStatus(email, 'error', { error_message: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const message = error instanceof Error ? error.message : 'Destruction failed';
    await updateInstanceStatus(email, 'error', { error_message: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Remove DB row
  try {
    await deleteInstanceByUserId(email);
  } catch (error) {
    console.error('Failed to delete instance record:', error);
  }

  return NextResponse.json({ success: true });
}
