import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getInstanceByUserId } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instance = await getInstanceByUserId(email);
  if (!instance || instance.status !== 'running' || !instance.gateway_url || !instance.gateway_token) {
    return NextResponse.json({ error: 'No running gateway instance' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { message?: string; conversationId?: string; model?: string };
  if (!body.message || typeof body.message !== 'string' || body.message.length > 32_000) {
    return NextResponse.json({ error: 'message is required and must be under 32000 characters' }, { status: 400 });
  }

  try {
    const gatewayRes = await fetch(`${instance.gateway_url}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instance.gateway_token}`,
      },
      body: JSON.stringify({
        message: body.message,
        conversationId: body.conversationId ?? 'default',
        ...(body.model ? { model: body.model } : {}),
      }),
    });

    if (!gatewayRes.ok) {
      const err = await gatewayRes.json().catch(() => ({ error: 'Gateway error' })) as { error?: string };
      return NextResponse.json({ error: err.error ?? 'Gateway error' }, { status: gatewayRes.status });
    }

    const data = await gatewayRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Chat proxy error:', err);
    return NextResponse.json({ error: 'Failed to reach gateway' }, { status: 502 });
  }
}
