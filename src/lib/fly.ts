import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createSubdomainCname, deleteSubdomainCname } from '@/lib/porkbun';
import { getSupabase } from '@/lib/supabase';
import { issueProxyToken } from '@/lib/proxy-auth';

const FLY_API_BASE = 'https://api.machines.dev/v1';
const FLY_GQL_URL = 'https://api.fly.io/graphql';

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
  const slug = email
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  // Guard against empty slug from malformed email
  return slug || email.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'user';
}

async function generateUniqueSlug(email: string, exclude: Set<string> = new Set()): Promise<string> {
  const base = slugify(email);
  const prefix = getAppPrefix();
  const targetName = `${prefix}-${base}`;

  // Query exact match OR "{base}-{number}" variants (not sibling prefixes like oc-alexander)
  const { data: existing } = await getSupabase()
    .from('instances')
    .select('fly_app_name')
    .or(`fly_app_name.eq.${targetName},fly_app_name.like.${targetName}-%`);

  // Merge Supabase results with exclusion set (slugs that failed on Fly despite not being in DB)
  const taken = new Set([
    ...(existing?.map((r: { fly_app_name: string | null }) => r.fly_app_name) ?? []),
    ...Array.from(exclude).map(s => `${prefix}-${s}`),
  ]);

  if (!taken.has(targetName)) return base;

  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(`${prefix}-${candidate}`)) return candidate;
  }

  // Fallback: append random 4-char hex
  return `${base}-${randomBytes(2).toString('hex')}`;
}

/** Extended options for flyFetch that include Sentry suppression controls. */
type FlyFetchOptions = RequestInit & {
  /**
   * HTTP status codes that are expected operational outcomes (not bugs).
   * Errors with these status codes are thrown but NOT reported to Sentry.
   * Example: [409, 412, 422] for provisioning race conditions.
   */
  expectedStatuses?: number[];
};

async function flyFetch<T>(path: string, options: FlyFetchOptions = {}): Promise<T> {
  const { expectedStatuses, ...fetchOptions } = options;
  const token = getFlyToken();
  // FlyV1 tokens include their own auth scheme; legacy fo1_ tokens use Bearer
  const authHeader = token.startsWith('FlyV1 ') ? token : `Bearer ${token}`;
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...fetchOptions,
    signal: fetchOptions.signal ?? AbortSignal.timeout(30_000),
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Fly API ${res.status} on ${fetchOptions.method ?? 'GET'} ${path}: ${body}`);
    // Only report to Sentry if this status code is NOT expected
    if (!expectedStatuses?.includes(res.status)) {
      Sentry.captureException(err, { extra: { responseBody: body, status: res.status } });
    }
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
  await flyFetch(`/apps/${name}`, {
    method: 'DELETE',
    // 404 = app already deleted (idempotent cleanup)
    expectedStatuses: [404],
  });
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
    cmd?: string[];
    cpus?: number;
    memoryMb?: number;
    internalPort?: number;
  },
): Promise<FlyMachine> {
  const cpus = config.cpus ?? 2;
  const memoryMb = config.memoryMb ?? 2048;
  const internalPort = config.internalPort ?? 3000;

  return flyFetch<FlyMachine>(`/apps/${appName}/machines`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      region: config.region,
      config: {
        image: config.image,
        ...(config.cmd ? { init: { cmd: config.cmd } } : {}),
        env: config.env,
        guest: { cpus, memory_mb: memoryMb, cpu_kind: 'shared' },
        mounts: [{ volume: config.volumeId, path: '/data' }],
        services: [
          {
            protocol: 'tcp',
            internal_port: internalPort,
            ports: [
              { port: 80, handlers: ['http'] },
              { port: 443, handlers: ['tls', 'http'] },
            ],
            checks: [
              {
                type: 'tcp',
                port: internalPort,
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
  await flyFetch(`/apps/${appName}/machines/${machineId}?force=true`, {
    method: 'DELETE',
    // 404 = machine already deleted (idempotent cleanup)
    expectedStatuses: [404],
  });
}

export async function stopMachine(appName: string, machineId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/machines/${machineId}/stop`, {
    method: 'POST',
    // 409 = machine already stopped or in invalid state for stop (race condition)
    expectedStatuses: [409],
  });
}

export async function startMachine(appName: string, machineId: string): Promise<void> {
  await flyFetch(`/apps/${appName}/machines/${machineId}/start`, {
    method: 'POST',
    // 409 = machine already running
    expectedStatuses: [409],
  });
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

  const ALLOWED_ENV_KEYS = new Set(['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_OAUTH_TOKEN', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'XAI_API_KEY', 'COMPOSIO_API_KEY', 'COMPOSIO_ENTITY_ID', 'SELECTED_MODEL']);
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
  anthropicOauthToken?: string;
  openaiApiKey?: string;
  composioEntityId?: string;
}): Promise<ProvisionResult> {
  const prefix = getAppPrefix();
  const region = opts.region ?? 'iad';
  const gatewayToken = randomBytes(32).toString('hex');

  // Provisioning operations get a longer timeout (60s)
  const provisionSignal = AbortSignal.timeout(60_000);

  // 1. Generate unique slug and create Fly app (with retry for race conditions)
  let slug: string = '';
  let appName: string = '';
  const excludeSlugs = new Set<string>();
  for (let attempt = 0; attempt < 3; attempt++) {
    slug = await generateUniqueSlug(opts.userEmail, excludeSlugs);
    appName = `${prefix}-${slug}`;
    try {
      await flyFetch('/apps', {
        method: 'POST',
        signal: provisionSignal,
        body: JSON.stringify({ app_name: appName, org_slug: 'personal' }),
        // 422 = name taken (expected during retries for race conditions / orphaned apps)
        expectedStatuses: [422],
      });
      break;
    } catch (err) {
      if (attempt === 2 || !(err instanceof Error && err.message.includes('already'))) {
        throw err;
      }
      // Collision from race condition or orphaned Fly app — exclude this slug and retry
      excludeSlugs.add(slug);
    }
  }

  // 2. Allocate public IPs via GraphQL (Machines REST API has no /ips endpoint)
  const token = getFlyToken();
  const authHeader = token.startsWith('FlyV1 ') ? token : `Bearer ${token}`;
  try {
    const allocateIp = async (type: string) => {
      await fetch(FLY_GQL_URL, {
        method: 'POST',
        signal: provisionSignal,
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation($input: AllocateIPAddressInput!) { allocateIpAddress(input: $input) { ipAddress { id address type } } }`,
          variables: { input: { appId: appName, type } },
        }),
      });
    };
    await allocateIp('shared_v4');
    await allocateIp('v6');
  } catch {
    // Non-fatal — IPs may already exist
  }

  // 2b. Provision TLS certificate for custom domain
  const customDomain = `${slug}.openclaws.biz`;
  try {
    await fetch(FLY_GQL_URL, {
      method: 'POST',
      signal: provisionSignal,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation($appId: ID!, $hostname: String!) { addCertificate(appId: $appId, hostname: $hostname) { certificate { id hostname } } }`,
        variables: { appId: appName, hostname: customDomain },
      }),
    });
  } catch {
    // Non-fatal — cert may already exist or DNS not ready yet; falls back to .fly.dev
  }

  // 2c. Query cert validation target and create DNS CNAME via Porkbun API
  let cnameTarget = `${appName}.fly.dev`;
  try {
    const certRes = await fetch(FLY_GQL_URL, {
      method: 'POST',
      signal: provisionSignal,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($appId: String!, $hostname: String!) { app(name: $appId) { certificate(hostname: $hostname) { dnsValidationTarget } } }`,
        variables: { appId: appName, hostname: customDomain },
      }),
    });
    const certData = (await certRes.json()) as { data?: { app?: { certificate?: { dnsValidationTarget?: string } } } };
    const validationTarget = certData?.data?.app?.certificate?.dnsValidationTarget;
    if (validationTarget) {
      cnameTarget = validationTarget;
    } else {
      Sentry.captureMessage('Missing dnsValidationTarget after addCertificate', {
        level: 'warning',
        extra: { appName, customDomain, certData },
      });
    }
  } catch {
    // Non-fatal — use default .fly.dev target
  }

  try {
    await createSubdomainCname(slug, cnameTarget);
  } catch (err) {
    Sentry.captureException(err, { extra: { slug, appName, cnameTarget } });
    // Non-fatal — DNS can be created manually; gateway falls back to .fly.dev URL
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
        size_gb: 3,
      }),
    });
  } catch (err) {
    // Cleanup app on volume creation failure
    await deleteApp(appName).catch(() => {});
    throw err;
  }

  let machine: FlyMachine;
  try {
    // 4. Create machine with real OpenClaw
    const gatewayConfig = JSON.stringify({
      agents: {
        list: [{
          id: 'main',
          identity: {
            name: 'OpenClaws Agent',
            emoji: '🦞',
          },
        }],
      },
      gateway: {
        controlUi: {
          allowedOrigins: [`https://${slug}.openclaws.biz`, `https://${appName}.fly.dev`, 'https://openclaws.biz'],
          allowInsecureAuth: false,
        },
      },
      skills: {
        entries: {
          composio: { enabled: true },
        },
      },
    });
    machine = await flyFetch<FlyMachine>(`/apps/${appName}/machines`, {
      method: 'POST',
      signal: provisionSignal,
      body: JSON.stringify({
        name: `gw-${slug}`,
        region,
        config: {
          image: 'ghcr.io/openclaw/openclaw:main',
          init: {
            cmd: [
              'sh', '-c',
              // Seed gateway config + agent identity; rm -f first because OpenClaw image runs as node (uid 1000)
              `rm -f /data/openclaw.json 2>/dev/null; printf '%s' '${gatewayConfig.replace(/'/g, "'\\''")}' > /data/openclaw.json; mkdir -p /.openclaw/workspace; cat > /.openclaw/workspace/IDENTITY.md << 'OCID'
# OpenClaws Agent

You are the OpenClaws AI assistant — a personal AI agent deployed and managed by the OpenClaws platform (openclaws.biz).

## Identity
- **Name**: OpenClaws Agent
- **Platform**: OpenClaws by Bearified

## Personality
- Be concise, helpful, and direct
- Match the user's energy — casual if they're casual, technical if they're technical
- You are NOT "Claude by Anthropic" — you are the user's personal OpenClaws agent
- Never say "I'm Claude" or "I was made by Anthropic" — say "I'm your OpenClaws agent"
- If asked who you are: "I'm your OpenClaws agent — your personal AI assistant running on your dedicated gateway"
OCID
ln -sfn /data/skills/composio /app/skills/composio 2>/dev/null; (while true; do sleep 5; OPENCLAW_GATEWAY_PORT=3000 OPENCLAW_GATEWAY_TOKEN=$OPENCLAW_GATEWAY_TOKEN openclaw devices approve --latest 2>/dev/null; done) & exec node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan`,
            ],
          },
          env: {
            NODE_ENV: 'production',
            NODE_OPTIONS: '--max-old-space-size=1536',
            PATH: '/data/bin:/data/node_modules/.bin:/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            OPENCLAW_PREFER_PNPM: '1',
            OPENCLAW_STATE_DIR: '/data',
            OPENCLAW_GATEWAY_TOKEN: gatewayToken,
            ...(opts.anthropicApiKey ? { ANTHROPIC_API_KEY: opts.anthropicApiKey.trim() } : {}),
            ...(opts.anthropicOauthToken ? { ANTHROPIC_OAUTH_TOKEN: opts.anthropicOauthToken.trim() } : {}),
            ...(opts.openaiApiKey ? { OPENAI_API_KEY: opts.openaiApiKey.trim() } : {}),
            // Managed mode: proxy through OpenClaws instead of injecting platform key
            ...(!opts.anthropicApiKey && !opts.anthropicOauthToken && process.env.ANTHROPIC_API_KEY
              ? {
                  ANTHROPIC_BASE_URL: `${process.env.NEXTAUTH_URL ?? 'https://openclaws.biz'}/api/proxy/anthropic`,
                  ANTHROPIC_API_KEY: issueProxyToken(opts.userEmail, 'anthropic', 30 * 24 * 60 * 60 * 1000),
                }
              : {}),
            // Composio toolkit bridge — platform key + per-user entity
            ...(process.env.COMPOSIO_API_KEY
              ? { COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY.trim() }
              : {}),
            ...(opts.composioEntityId
              ? { COMPOSIO_ENTITY_ID: opts.composioEntityId }
              : {}),
          },
          guest: { cpus: 2, memory_mb: 2048, cpu_kind: 'shared' },
          mounts: [{ volume: volume.id, path: '/data' }],
          services: [
            {
              protocol: 'tcp',
              internal_port: 3000,
              ports: [
                { port: 80, handlers: ['http'] },
                { port: 443, handlers: ['tls', 'http'] },
              ],
              checks: [
                {
                  type: 'tcp',
                  port: 3000,
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

  // 5. Wait for gateway to become healthy (real OpenClaw may take 30-60s)
  const gatewayUrl = `https://${customDomain}`;
  const healthCheckUrl = `https://${appName}.fly.dev`;
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      // Any response (even 401) means the server is up
      const res = await fetch(healthCheckUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.status > 0) {
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

  // 6. Set up Composio toolkit bridge (fire-and-forget, non-blocking)
  if (opts.composioEntityId) {
    setupComposioOnGateway(appName, machine.id).catch((err) => {
      Sentry.captureException(err, { extra: { appName, step: 'composio-setup' } });
    });
  }

  return {
    appName,
    machineId: machine.id,
    volumeId: volume.id,
    gatewayUrl,
    gatewayToken,
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

  // Clean up DNS record
  const prefix = getAppPrefix();
  const slug = opts.appName.startsWith(`${prefix}-`) ? opts.appName.slice(prefix.length + 1) : null;
  if (slug) {
    await deleteSubdomainCname(slug).catch(() => {});
  }
}

// --- Composio toolkit bridge setup ---

async function execOnMachine(
  appName: string,
  machineId: string,
  command: string[],
  timeout = 30,
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  return flyFetch<{ stdout: string; stderr: string; exit_code: number }>(
    `/apps/${appName}/machines/${machineId}/exec`,
    {
      method: 'POST',
      signal: AbortSignal.timeout((timeout + 5) * 1000),
      body: JSON.stringify({ command, timeout }),
      // 412 = machine not running (expected when instance is stopped/sleeping)
      expectedStatuses: [412],
    },
  );
}

// --- Gateway config management ---

/**
 * Read the current openclaw.json config from a running gateway machine.
 */
export async function readGatewayConfig(
  appName: string,
  machineId: string,
): Promise<Record<string, unknown>> {
  const result = await execOnMachine(appName, machineId, ['cat', '/data/openclaw.json'], 10);
  try {
    return JSON.parse(result.stdout) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Merge a partial config into the gateway's openclaw.json and signal reload.
 * Uses deep merge for top-level objects so existing config is preserved.
 */
export async function patchGatewayConfig(
  appName: string,
  machineId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const current = await readGatewayConfig(appName, machineId);

  // Deep merge top-level keys
  const merged = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current[key] !== null &&
      typeof current[key] === 'object' &&
      !Array.isArray(current[key])
    ) {
      merged[key] = { ...(current[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      merged[key] = value;
    }
  }

  const configJson = JSON.stringify(merged, null, 2);
  const b64 = Buffer.from(configJson).toString('base64');
  await execOnMachine(
    appName,
    machineId,
    ['sh', '-c', `echo '${b64}' | base64 -d > /data/openclaw.json && kill -USR1 1 2>/dev/null; true`],
    15,
  );
}

/**
 * Read configured channels from a running gateway.
 */
export async function getGatewayChannels(
  appName: string,
  machineId: string,
): Promise<Record<string, unknown>> {
  const config = await readGatewayConfig(appName, machineId);
  return (config.channels as Record<string, unknown>) ?? {};
}

/**
 * Set or update a specific channel config on the gateway.
 */
export async function setGatewayChannel(
  appName: string,
  machineId: string,
  channel: string,
  channelConfig: Record<string, unknown>,
): Promise<void> {
  const config = await readGatewayConfig(appName, machineId);
  const channels = (config.channels as Record<string, unknown>) ?? {};
  channels[channel] = channelConfig;
  await patchGatewayConfig(appName, machineId, { channels });
}

/**
 * Remove a channel config from the gateway.
 */
export async function removeGatewayChannel(
  appName: string,
  machineId: string,
  channel: string,
): Promise<void> {
  const config = await readGatewayConfig(appName, machineId);
  const channels = (config.channels as Record<string, unknown>) ?? {};
  delete channels[channel];
  await patchGatewayConfig(appName, machineId, { channels });
}

const COMPOSIO_EXEC_SCRIPT = `#!/usr/bin/env python3
import sys, os, json, urllib.request

if len(sys.argv) < 2:
    print("Usage: composio-exec <ACTION> [JSON_PARAMS]")
    sys.exit(1)

action = sys.argv[1]
params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
app_name = action.split("_")[0].lower()

body = json.dumps({
    "entityId": os.environ.get("COMPOSIO_ENTITY_ID", ""),
    "appName": app_name,
    "input": params
}).encode()

req = urllib.request.Request(
    f"https://backend.composio.dev/api/v2/actions/{action}/execute",
    data=body,
    headers={
        "x-api-key": os.environ.get("COMPOSIO_API_KEY", ""),
        "Content-Type": "application/json",
        "User-Agent": "composio-exec/1.0"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(json.dumps({"error": e.read().decode(), "status": e.code, "successful": False}))
except Exception as e:
    print(json.dumps({"error": str(e), "successful": False}))`;

const COMPOSIO_SKILL_MD = `---
name: composio
description: "Execute actions on 1000+ connected services (Gmail, Slack, GitHub, Notion, etc.) via Composio toolkits. Use when: (1) user asks to send an email, read Gmail, or manage inbox, (2) user asks to send a Slack message, read channels, or manage Slack, (3) user asks to create/read/update GitHub issues, PRs, or repos via Composio, (4) user asks to interact with any connected third-party service, (5) user asks what toolkits or integrations are available. NOT for: local git operations (use git/gh CLI), weather (use weather skill), or services the user has not connected."
metadata: { "openclaw": { "emoji": "\\uD83E\\uDDE9", "requires": { "bins": ["composio-exec"] } } }
---

# Composio Toolkits

Execute actions on connected third-party services via Composio.

## Commands

### List Connected Services
\\\`\\\`\\\`bash
composio connections --active
\\\`\\\`\\\`

### List Actions
\\\`\\\`\\\`bash
composio actions --apps gmail --limit 20
composio actions --use-case "send email"
\\\`\\\`\\\`

### Execute Actions
\\\`\\\`\\\`bash
composio-exec GMAIL_FETCH_EMAILS '{"max_results": 5}'
composio-exec GMAIL_SEND_EMAIL '{"to": "user@example.com", "subject": "Hello", "body": "Message"}'
composio-exec SLACK_SEND_MESSAGE '{"channel": "#general", "text": "Hello!"}'
\\\`\\\`\\\`

## Workflow
1. Check \\\`composio connections --active\\\`
2. Discover actions with \\\`composio actions --apps <name>\\\`
3. Execute with \\\`composio-exec <ACTION> '<json>'\\\``;

/**
 * Install Composio CLI, bridge script, and skill on a freshly provisioned gateway.
 * Runs async after provisioning — failures are logged but don't block the user.
 */
async function setupComposioOnGateway(appName: string, machineId: string): Promise<void> {
  const setup = async (cmd: string[], timeout = 30) =>
    execOnMachine(appName, machineId, ['sh', '-c', cmd.join(' && ')], timeout);

  // Install composio-core to persistent volume (may take 30-60s)
  await setup([
    'cd /data',
    'npm install --save composio-core 2>&1 | tail -3',
  ], 120);

  // Install composio-exec wrapper to persistent volume + symlink into PATH
  const b64Script = Buffer.from(COMPOSIO_EXEC_SCRIPT).toString('base64');
  await setup([
    'mkdir -p /data/bin',
    `echo '${b64Script}' | base64 -d > /data/bin/composio-exec`,
    'chmod +x /data/bin/composio-exec',
    'ln -sf /data/bin/composio-exec /usr/local/bin/composio-exec',
    'ln -sf /data/node_modules/.bin/composio /usr/local/bin/composio',
  ]);

  // Install skill
  const b64Skill = Buffer.from(COMPOSIO_SKILL_MD).toString('base64');
  await setup([
    'mkdir -p /data/skills/composio',
    `echo '${b64Skill}' | base64 -d > /data/skills/composio/SKILL.md`,
    'ln -sf /data/skills/composio /app/skills/composio',
  ]);
}
