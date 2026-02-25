import { Composio, type AppItemListResponse, type ConnectionItem } from 'composio-core';
import type { Session } from 'next-auth';

export type ToolkitStatus = 'connect' | 'connected' | 'active';

type ToolkitConnectionState = {
  status: ToolkitStatus;
  connectedAccountId?: string;
};

type ToolkitStatusIndex = {
  byAppId: Map<string, ToolkitConnectionState>;
  byAppName: Map<string, ToolkitConnectionState>;
};

const MAX_CONNECTIONS_PAGE_SIZE = 200;
let composioClient: Composio | null = null;

function normalizeToken(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function rankStatus(status: ToolkitStatus) {
  if (status === 'active') return 2;
  if (status === 'connected') return 1;
  return 0;
}

function mergeStatus(
  map: Map<string, ToolkitConnectionState>,
  key: string,
  next: ToolkitConnectionState,
) {
  if (!key) return;
  const current = map.get(key);
  if (!current || rankStatus(next.status) > rankStatus(current.status)) {
    map.set(key, next);
  }
}

function deriveStatus(connection: ConnectionItem): ToolkitConnectionState {
  const normalizedStatus = connection.status?.toUpperCase();
  const isDisabled = connection.isDisabled === true || connection.enabled === false;

  if (isDisabled) {
    return {
      status: 'connect',
      connectedAccountId: connection.id,
    };
  }

  if (normalizedStatus === 'ACTIVE') {
    return {
      status: connection.enabled === true ? 'active' : 'connected',
      connectedAccountId: connection.id,
    };
  }

  if (normalizedStatus === 'INITIATED') {
    return {
      status: 'connected',
      connectedAccountId: connection.id,
    };
  }

  return {
    status: 'connect',
    connectedAccountId: connection.id,
  };
}

export function isComposioConfigured() {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

export function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Composio API key is not configured');
  }

  if (!composioClient) {
    composioClient = new Composio({ apiKey });
  }

  return composioClient;
}

export function getComposioEntityId(session: Session) {
  const email = session.user?.email?.trim().toLowerCase();
  if (email) return email;

  const name = session.user?.name?.trim().toLowerCase();
  if (name) return `user:${name.replace(/\s+/g, '-')}`;

  throw new Error('Unable to resolve Composio entity ID from session');
}

export async function listEnabledApps() {
  const composio = getComposioClient();
  const apps = await composio.apps.list();

  return apps
    .filter((app) => app.enabled)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listEntityConnections(entityId: string) {
  const composio = getComposioClient();
  const items: ConnectionItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await composio.connectedAccounts.list({
      entityId,
      page,
      pageSize: MAX_CONNECTIONS_PAGE_SIZE,
      showDisabled: true,
    });

    items.push(...response.items);
    totalPages = Math.max(response.totalPages, 1);
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function buildToolkitStatusIndex(connections: ConnectionItem[]): ToolkitStatusIndex {
  const byAppId = new Map<string, ToolkitConnectionState>();
  const byAppName = new Map<string, ToolkitConnectionState>();

  for (const connection of connections) {
    const next = deriveStatus(connection);
    mergeStatus(byAppId, normalizeToken(connection.appUniqueId), next);
    mergeStatus(byAppName, normalizeToken(connection.appName), next);
  }

  return { byAppId, byAppName };
}

export function getToolkitStatusForApp(
  app: AppItemListResponse,
  index: ToolkitStatusIndex,
): ToolkitConnectionState {
  return (
    index.byAppId.get(normalizeToken(app.appId)) ??
    index.byAppName.get(normalizeToken(app.key)) ??
    index.byAppName.get(normalizeToken(app.name)) ?? { status: 'connect' }
  );
}
