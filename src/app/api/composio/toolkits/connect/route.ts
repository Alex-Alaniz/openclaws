import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getComposioClient, getComposioEntityId, isComposioConfigured } from '@/lib/composio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConnectBody = {
  appName?: unknown;
};

function buildRedirectUri(request: Request) {
  const origin = request.headers.get('origin')?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!origin) return undefined;
  return `${origin.replace(/\/+$/, '')}/dashboard/toolkits`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isComposioConfigured()) {
    return NextResponse.json({ error: 'Composio is not configured on the server.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as ConnectBody | null;
  const appName = typeof body?.appName === 'string' ? body.appName.trim() : '';

  if (!appName) {
    return NextResponse.json({ error: 'A valid appName is required.' }, { status: 400 });
  }

  try {
    const entityId = getComposioEntityId(session);
    const entity = getComposioClient().getEntity(entityId);
    const redirectUri = buildRedirectUri(request);

    const requestResult = await entity.initiateConnection({
      appName,
      redirectUri,
      config: { redirectUrl: redirectUri },
    });

    return NextResponse.json({
      appName,
      connectedAccountId: requestResult.connectedAccountId,
      connectionStatus: requestResult.connectionStatus,
      redirectUrl: requestResult.redirectUrl,
    });
  } catch (error) {
    console.error(`Failed to initiate Composio connection for ${appName}`, error);
    return NextResponse.json(
      { error: 'Failed to initiate Composio connection.' },
      { status: 500 },
    );
  }
}
