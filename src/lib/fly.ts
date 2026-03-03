import { randomUUID } from 'crypto';

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
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getFlyToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Fly API ${res.status} on ${options.method ?? 'GET'} ${path}: ${body}`);
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
                interval: 15000,
                timeout: 5000,
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

// --- Provisioning orchestrator ---

export async function provisionGateway(opts: {
  userId: string;
  userEmail: string;
  region?: string;
}): Promise<ProvisionResult> {
  const prefix = getAppPrefix();
  const slug = slugify(opts.userEmail);
  const appName = `${prefix}-${slug}`;
  const region = opts.region ?? 'iad';
  const gatewayToken = randomUUID();
  const setupPassword = randomUUID();

  // 1. Create Fly app
  await createApp(appName);

  let volume: FlyVolume;
  try {
    // 2. Create persistent volume
    volume = await createVolume(appName, {
      name: `data-${slug}`,
      region,
      size_gb: 1,
    });
  } catch (err) {
    // Cleanup app on volume creation failure
    await deleteApp(appName).catch(() => {});
    throw err;
  }

  let machine: FlyMachine;
  try {
    // 3. Create machine with OpenClaw Gateway
    machine = await createMachine(appName, {
      name: `gw-${slug}`,
      region,
      image: 'ghcr.io/alex-alaniz/openclaw-gateway:latest',
      env: {
        PORT: '8080',
        SETUP_PASSWORD: setupPassword,
        OPENCLAW_STATE_DIR: '/data/state',
        OPENCLAW_WORKSPACE_DIR: '/data/workspace',
        OPENCLAW_GATEWAY_TOKEN: gatewayToken,
        ...(process.env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } : {}),
      },
      volumeId: volume.id,
    });
  } catch (err) {
    // Cleanup volume + app on machine creation failure
    await deleteVolume(appName, volume.id).catch(() => {});
    await deleteApp(appName).catch(() => {});
    throw err;
  }

  return {
    appName,
    machineId: machine.id,
    volumeId: volume.id,
    gatewayUrl: `https://${appName}.fly.dev`,
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
