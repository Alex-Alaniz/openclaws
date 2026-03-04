import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/nextjs';

const FLY_API_BASE = 'https://api.machines.dev/v1';

export type FlyVolume = {
  id: string;
  name: string;
  region: string;
  size_gb: number;
  state: string;
};

export type FlyMachine = {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
};

export type ProvisionResult = {
  appName: string;
  machineId: string;
  volumeId: string;
  gatewayUrl: string;
  gatewayToken: string;
  setupPassword: string;
};

function getFlyToken(): string {
  const token = process.env.FLY_API_TOKEN?.trim();
  if (!token) throw new Error('FLY_API_TOKEN is not configured');
  return token;
}

function getAppPrefix(): string {
  return process.env.FLY_APP_PREFIX?.trim() || 'oc';
}

function slugify(email: string): string {
  return email
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

async function flyFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getFlyToken();
  // FlyV1 tokens include their own auth scheme; legacy fo1_ tokens use Bearer
  const authHeader = token.startsWith('FlyV1 ') ? token : `Bearer ${token}`;
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(30_000),
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Fly API ${res.status} on ${options.method ?? 'GET'} ${path}`);
    Sentry.captureException(err, { extra: { responseBody: body, status: res.status } });
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- App lifecycle ---

export async function createApp(name: string, org: string = 'personal'): Promise<void> {
  await flyFetch('/apps', {
    method: 'POST',
    body: JSON.stringify({ app_name: name, org_slug: org }),
  });
}

export async function deleteApp(name: string): Promise<void> {
  await flyFetch(`/apps/${name}`, { method: 'DELETE' });
}

// --- Volume operations ---

export async function createVolume(
  appName: string,
  opts: { name: string; region: string; size_gb: number },
): Promise<FlyVolume> {
  return flyFetch<FlyVolume>(`/apps/${appName}/volumes`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function deleteVolume(appName: string, volumeId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/volumes/${volumeId}`, { method: 'DELETE' });
}

// --- Machine operations ---

export async function createMachine(
  appName: string,
  config: {
    name: string;
    region: string;
    image: string;
    env: Record<string, string>;
    volumeId: string;
  },
): Promise<FlyMachine> {
  return flyFetch<FlyMachine>(`/apps/${appName}/machines`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      region: config.region,
      config: {
        image: config.image,
        env: config.env,
        guest: { cpus: 1, memory_mb: 512, cpu_kind: 'shared' },
        mounts: [{ volume: config.volumeId, path: '/data' }],
        services: [
          {
            protocol: 'tcp',
            internal_port: 8080,
            ports: [
              { port: 80, handlers: ['http'] },
              { port: 443, handlers: ['tls', 'http'] },
            ],
            checks: [
              {
                type: 'http',
                path: '/healthz',
                interval: '15s',
                timeout: '5s',
              },
            ],
          },
        ],
      },
    }),
  });
}

export async function getMachine(appName: string, machineId: string): Promise<FlyMachine> {
  return flyFetch<FlyMachine>(`/apps/${appName}/machines/${machineId}`);
}

export async function deleteMachine(appName: string, machineId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/machines/${machineId}?force=true`, { method: 'DELETE' });
}

export async function stopMachine(appName: string, machineId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/machines/${machineId}/stop`, { method: 'POST' });
}

export async function startMachine(appName: string, machineId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/machines/${machineId}/start`, { method: 'POST' });
}

// --- Machine env update ---

export async function updateMachineEnv(
  appName: string,
  machineId: string,
  envUpdates: Record<string, string>,
): Promise<void> {
  // Fetch current machine config
  const machine = await flyFetch<{ config: { env?: Record<string, string>; [key: string]: unknown } }>(
    `/apps/${appName}/machines/${machineId}`,
  );

  const ALLOWED_ENV_KEYS = new Set(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'OPENAI_API_KEY', 'SELECTED_MODEL']);
  const safeUpdates: Record<string, string> = {};
  for (const [k, v] of Object.entries(envUpdates)) {
    if (ALLOWED_ENV_KEYS.has(k)) safeUpdates[k] = v;
  }

  const currentEnv = machine.config.env ?? {};
  const mergedEnv = { ...currentEnv, ...safeUpdates };

  // Stop machine — Fly requires stopped state for config updates
  await stopMachine(appName, machineId).catch(() => {});
  await flyFetch(`/apps/${appName}/machines/${machineId}/wait?state=stopped&timeout=30`, {
    method: 'GET',
  }).catch(() => {});

  // Update machine with merged env (POST triggers restart)
  await flyFetch(`/apps/${appName}/machines/${machineId}`, {
    method: 'POST',
    body: JSON.stringify({
      config: {
        ...machine.config,
        env: mergedEnv,
      },
    }),
  });
}

// --- Provisioning orchestrator ---

export async function provisionGateway(opts: {
  userId: string;
  userEmail: string;
  region?: string;
  anthropicApiKey?: string;
  anthropicAuthToken?: string;
  openaiApiKey?: string;
  selectedModel?: string;
}): Promise<ProvisionResult> {
  const prefix = getAppPrefix();
  const slug = slugify(opts.userEmail);
  const appName = `${prefix}-${slug}`;
  const region = opts.region ?? 'iad';
  const gatewayToken = randomUUID();
  const setupPassword = randomUUID();

  // Provisioning operations get a longer timeout (60s)
  const provisionSignal = AbortSignal.timeout(60_000);

  // 1. Create Fly app (idempotent — ignore "already exists")
  try {
    await flyFetch('/apps', {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({ app_name: appName, org_slug: 'personal' }),
    });
  } catch (err) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      throw err;
    }
  }

  // 2. Allocate public IPs (required for DNS/TLS)
  try {
    await flyFetch(`/apps/${appName}/ips`, {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({ type: 'shared_v4' }),
    });
    await flyFetch(`/apps/${appName}/ips`, {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({ type: 'v6' }),
    });
  } catch {
    // Non-fatal — IPs may already exist or shared_v4 may suffice
  }

  let volume: FlyVolume;
  try {
    // 3. Create persistent volume
    volume = await flyFetch<FlyVolume>(`/apps/${appName}/volumes`, {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({
        name: `data_${slug.replace(/-/g, '_')}`,
        region,
        size_gb: 1,
      }),
    });
  } catch (err) {
    // Cleanup app on volume creation failure
    await deleteApp(appName).catch(() => {});
    throw err;
  }

  let machine: FlyMachine;
  try {
    // 4. Create machine with OpenClaw Gateway
    machine = await flyFetch<FlyMachine>(`/apps/${appName}/machines`, {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({
        name: `gw-${slug}`,
        region,
        config: {
          image: 'ghcr.io/alex-alaniz/openclaw-gateway:latest',
          env: {
            PORT: '8080',
            SETUP_PASSWORD: setupPassword,
            OPENCLAW_STATE_DIR: '/data/state',
            OPENCLAW_WORKSPACE_DIR: '/data/workspace',
            OPENCLAW_GATEWAY_TOKEN: gatewayToken,
            ...(opts.anthropicApiKey ? { ANTHROPIC_API_KEY: opts.anthropicApiKey.trim() } : {}),
            ...(opts.anthropicAuthToken ? { ANTHROPIC_AUTH_TOKEN: opts.anthropicAuthToken.trim() } : {}),
            ...(opts.openaiApiKey ? { OPENAI_API_KEY: opts.openaiApiKey.trim() } : {}),
            ...(opts.selectedModel ? { SELECTED_MODEL: opts.selectedModel.trim() } : {}),
            // Fallback to platform key if no user key provided
            ...(!opts.anthropicApiKey && !opts.anthropicAuthToken && process.env.ANTHROPIC_API_KEY
              ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY.trim() }
              : {}),
          },
          guest: { cpus: 1, memory_mb: 512, cpu_kind: 'shared' },
          mounts: [{ volume: volume.id, path: '/data' }],
          services: [
            {
              protocol: 'tcp',
              internal_port: 8080,
              ports: [
                { port: 80, handlers: ['http'] },
                { port: 443, handlers: ['tls', 'http'] },
              ],
              checks: [
                {
                  type: 'http',
                  path: '/healthz',
                  interval: '15s',
                  timeout: '5s',
                },
              ],
            },
          ],
        },
      }),
    });
  } catch (err) {
    // Cleanup volume + app on machine creation failure
    await deleteVolume(appName, volume.id).catch(() => {});
    await deleteApp(appName).catch(() => {});
    throw err;
  }

  // 5. Wait for gateway to become healthy
  const gatewayUrl = `https://${appName}.fly.dev`;
  let healthy = false;
  for (let i = 0; i < 15; i++) {
    try {
      const healthRes = await fetch(`${gatewayUrl}/healthz`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        healthy = true;
        break;
      }
    } catch {
      // Gateway not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!healthy) {
    throw new Error('Gateway failed health check after provisioning');
  }

  return {
    appName,
    machineId: machine.id,
    volumeId: volume.id,
    gatewayUrl,
    gatewayToken,
    setupPassword,
  };
}

export async function destroyGateway(opts: {
  appName: string;
  machineId: string;
  volumeId: string;
}): Promise<void> {
  // Stop machine (ignore errors — may already be stopped)
  await stopMachine(opts.appName, opts.machineId).catch(() => {});

  // Delete machine
  await deleteMachine(opts.appName, opts.machineId).catch(() => {});

  // Delete volume
  await deleteVolume(opts.appName, opts.volumeId).catch(() => {});

  // Delete app
  await deleteApp(opts.appName).catch(() => {});
}
