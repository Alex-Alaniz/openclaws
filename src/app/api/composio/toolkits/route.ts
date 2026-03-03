import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  buildToolkitStatusIndex,
  getComposioEntityId,
  getToolkitStatusForApp,
  isComposioConfigured,
  listEnabledApps,
  listEntityConnections,
} from '@/lib/composio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fallbackLogoUrl(slug: string) {
  return `https://logos.composio.dev/api/${slug}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email?.trim().toLowerCase() ?? 'anon';
  const rl = rateLimit(`${email}:/api/composio/toolkits`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: 'Composio is not configured on the server.' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  try {
    const entityId = getComposioEntityId(session);
    const [apps, connections] = await Promise.all([
      listEnabledApps(),
      listEntityConnections(entityId).catch(() => []),
    ]);

    const statusIndex = buildToolkitStatusIndex(connections);
    const toolkits = apps.map((app) => {
      const state = getToolkitStatusForApp(app, statusIndex);
      const slug = app.key.toLowerCase();

      return {
        key: app.key,
        slug,
        name: app.name,
        logoUrl: app.logo || fallbackLogoUrl(slug),
        status: state.status,
        connectedAccountId: state.connectedAccountId ?? null,
      };
    });

    const connectedCount = toolkits.filter((toolkit) => toolkit.status !== 'connect').length;
    const activeCount = toolkits.filter((toolkit) => toolkit.status === 'active').length;

    return NextResponse.json(
      {
        toolkits,
        counts: {
          total: toolkits.length,
          connected: connectedCount,
          active: activeCount,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Failed to list Composio toolkits', error);
    return NextResponse.json(
      { error: 'Failed to fetch toolkits from Composio.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
