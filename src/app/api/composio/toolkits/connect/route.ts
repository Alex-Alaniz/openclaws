import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { ComposioError } from 'composio-core';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getComposioClient, getComposioEntityId, isComposioConfigured } from '@/lib/composio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConnectBody = {
  appName?: unknown;
};

function buildRedirectUri() {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) return undefined;
  return `${base.replace(/\/+$/, '')}/dashboard/toolkits`;
}

function getComposioErrorStatus(error: unknown) {
  if (!(error instanceof ComposioError)) return null;

  const statusCode = (error.metadata as { statusCode?: unknown } | undefined)?.statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}

function getComposioErrorMessage(error: unknown) {
  if (!(error instanceof ComposioError)) return null;

  return error.message?.trim() || error.description?.trim() || null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email?.trim().toLowerCase() ?? 'anon';
  const rl = await rateLimit(`${email}:/api/composio/toolkits/connect`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

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
    const redirectUri = buildRedirectUri();
    const connectionParams = redirectUri
      ? {
          appName,
          redirectUri,
          config: { redirectUrl: redirectUri },
        }
      : { appName };

    const requestResult = await entity.initiateConnection(connectionParams);

    return NextResponse.json({
      appName,
      connectedAccountId: requestResult.connectedAccountId,
      connectionStatus: requestResult.connectionStatus,
      redirectUrl: requestResult.redirectUrl,
    });
  } catch (error) {
    const statusCode = getComposioErrorStatus(error);
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        { error: getComposioErrorMessage(error) ?? 'Unable to start that Composio connection.' },
        { status: statusCode },
      );
    }

    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to initiate Composio connection.' },
      { status: 500 },
    );
  }
}
