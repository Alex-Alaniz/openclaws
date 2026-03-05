'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  trackCheckoutStarted,
  trackCheckoutCompleted,
  trackProvisionStarted,
  trackProvisionSucceeded,
  trackInstanceDestroyed,
  trackModelChanged,
  trackApiKeyAdded,
  trackApiKeyDeleted,
} from '@/lib/analytics';

type InstanceData = {
  id: string;
  user_id: string;
  fly_region: string;
  gateway_url: string | null;
  status: string;
  error_message: string | null;
  selected_model: string;
  ai_mode: string;
  created_at: string;
};

type ProviderKeyInfo = {
  provider: string;
  keyType: string;
  keySuffix: string;
  validated: boolean;
  validatedAt: string | null;
};

const MODELS = [
  { id: 'claude-sonnet-4-6-20260301', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-opus-4-6-20260301', label: 'Claude Opus 4.6', provider: 'anthropic' },
  { id: 'gpt-5.3', label: 'GPT-5.3', provider: 'openai' },
] as const;

export default function SettingsPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Instance state
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(true);
  const [instanceError, setInstanceError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [gatewayToken, setGatewayToken] = useState<string | null>(null);

  // Model state
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [modelLoading, setModelLoading] = useState(false);

  // Provider keys state
  const [providerKeys, setProviderKeys] = useState<ProviderKeyInfo[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState('managed');

  // Subscription state
  const [subActive, setSubActive] = useState<boolean | null>(null);
  const [subStatus, setSubStatus] = useState<string>('none');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wasUpgraded = params.get('upgraded') === 'true';
    setUpgraded(wasUpgraded);
    setCancelled(params.get('cancelled') === 'true');
    if (wasUpgraded) trackCheckoutCompleted();
  }, []);

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/instance');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to fetch instance');
      const data = (await res.json()) as { instance: InstanceData | null };
      setInstance(data.instance);
      if (data.instance?.selected_model) setSelectedModel(data.instance.selected_model);
      if (data.instance?.ai_mode) setAiMode(data.instance.ai_mode);
      setInstanceError(null);
    } catch (err) {
      setInstanceError(err instanceof Error ? err.message : 'Failed to load instance');
    } finally {
      setInstanceLoading(false);
    }
  }, []);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/provider-keys');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) return;
      const data = (await res.json()) as { keys: ProviderKeyInfo[] };
      setProviderKeys(data.keys);
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchModel = useCallback(async () => {
    try {
      const res = await fetch('/api/model');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) return;
      const data = (await res.json()) as { selectedModel: string; aiMode: string };
      setSelectedModel(data.selectedModel);
      setAiMode(data.aiMode);
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) return;
      const data = (await res.json()) as { active: boolean; status: string };
      setSubActive(data.active);
      setSubStatus(data.status);
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch('/api/instance/token');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) return;
      const data = (await res.json()) as { token: string | null };
      setGatewayToken(data.token);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchInstance();
    fetchKeys();
    fetchModel();
    fetchSubscription();
  }, [fetchInstance, fetchKeys, fetchModel, fetchSubscription]);

  // Fetch token when instance is running
  useEffect(() => {
    if (instance?.status === 'running') fetchToken();
  }, [instance?.status, fetchToken]);

  // Poll while provisioning
  useEffect(() => {
    if (instance?.status !== 'provisioning') return;
    const interval = setInterval(fetchInstance, 5000);
    return () => clearInterval(interval);
  }, [instance?.status, fetchInstance]);

  const handleProvision = async () => {
    setIsProvisioning(true);
    setInstanceError(null);
    trackProvisionStarted();
    try {
      const res = await fetch('/api/instance', { method: 'POST' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = (await res.json()) as { instance?: InstanceData; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Provisioning failed');
      setInstance(data.instance ?? null);
      trackProvisionSucceeded(data.instance?.fly_region);
    } catch (err) {
      setInstanceError(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleDestroy = async () => {
    if (!confirm('This will permanently delete your OpenClaw Gateway and all its data (messages, memories, cron jobs). Continue?')) return;
    setIsDestroying(true);
    setInstanceError(null);
    try {
      const res = await fetch('/api/instance', { method: 'DELETE' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Destruction failed');
      }
      setInstance(null);
      trackInstanceDestroyed();
    } catch (err) {
      setInstanceError(err instanceof Error ? err.message : 'Destruction failed');
    } finally {
      setIsDestroying(false);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    setModelLoading(true);
    try {
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to update model');
      setSelectedModel(modelId);
      trackModelChanged(modelId);
    } catch {
      // Error handled by UI state
    } finally {
      setModelLoading(false);
    }
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setKeySaving(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = (await res.json()) as { key?: ProviderKeyInfo; aiMode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save key');
      setKeyInput('');
      if (data.aiMode) setAiMode(data.aiMode);
      if (data.key?.provider) trackApiKeyAdded(data.key.provider);
      await fetchKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setKeySaving(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    try {
      const res = await fetch(`/api/provider-keys?provider=${provider}`, { method: 'DELETE' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to delete key');
      trackApiKeyDeleted(provider);
      await fetchKeys();
      await fetchModel();
    } catch {
      // Error handled by UI state
    }
  };

  const handleValidateKey = async (provider: string) => {
    setValidatingProvider(provider);
    try {
      const res = await fetch('/api/provider-keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      await fetchKeys();
      const data = (await res.json()) as { valid: boolean; error?: string };
      if (!data.valid) {
        setKeyError(data.error ?? 'Validation failed');
      }
    } catch {
      setKeyError('Validation request failed');
    } finally {
      setValidatingProvider(null);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsRedirecting(true);
      setError(null);
      trackCheckoutStarted();
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
      if (response.status === 401) { window.location.href = '/login'; return; }
      if (!response.ok) throw new Error('Failed to create checkout session');
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
      setIsRedirecting(false);
    }
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-emerald-400',
      provisioning: 'bg-yellow-400 animate-pulse',
      error: 'bg-red-400',
      stopped: 'bg-zinc-400',
      deleting: 'bg-zinc-400 animate-pulse',
    };
    return colors[status] ?? 'bg-zinc-400';
  };

  // Detect what the user is pasting
  const detectedKeyType = keyInput.trim()
    ? keyInput.trim().startsWith('sk-ant-oat01-') ? 'Anthropic OAuth Token'
    : keyInput.trim().startsWith('sk-ant-api') ? 'Anthropic API Key'
    : keyInput.trim().startsWith('sk-') ? 'OpenAI API Key'
    : keyInput.trim().startsWith('AIza') ? 'Google API Key'
    : null
    : null;

  const hasProviderKey = (provider: string) => providerKeys.some((k) => k.provider === provider);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-white">Settings</h1>
        <p className="text-xs text-zinc-400">Configure model, keys, and billing</p>
      </div>

      {/* Model Selection */}
      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Model Selection</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            const needsKey = model.provider !== 'anthropic' && !hasProviderKey(model.provider);
            return (
              <button
                key={model.id}
                onClick={() => !needsKey && handleSelectModel(model.id)}
                disabled={modelLoading || needsKey}
                className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                  isSelected
                    ? 'border-[#DC2626] bg-[#DC2626]/10 text-white'
                    : needsKey
                      ? 'cursor-not-allowed border-white/5 bg-black/20 text-zinc-600'
                      : 'border-white/10 bg-black/30 text-zinc-200 hover:bg-white/10'
                }`}
              >
                <span>{model.label}</span>
                {needsKey ? (
                  <span className="mt-1 block text-xs text-zinc-600">Add API key below</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span>Mode:</span>
          <span className={`rounded px-2 py-0.5 ${
            aiMode === 'byoauth' ? 'bg-purple-500/20 text-purple-300'
            : aiMode === 'byokey' ? 'bg-blue-500/20 text-blue-300'
            : 'bg-zinc-500/20 text-zinc-400'
          }`}>
            {aiMode === 'byoauth' ? 'BYO OAuth' : aiMode === 'byokey' ? 'BYO Key' : 'Platform Managed'}
          </span>
        </div>
      </section>

      {/* API Keys */}
      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">API Keys</h2>

        {/* Existing keys */}
        {providerKeys.length > 0 ? (
          <div className="mb-4 space-y-2">
            {providerKeys.map((key) => (
              <div key={key.provider} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${key.validated ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <div>
                    <span className="text-sm font-medium capitalize text-zinc-200">{key.provider}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {key.keyType === 'oauth_token' ? 'OAuth' : 'API Key'} {key.keySuffix}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleValidateKey(key.provider)}
                    disabled={validatingProvider === key.provider}
                    className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    {validatingProvider === key.provider ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.provider)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add key input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setKeyError(null); }}
              placeholder="Paste API key or OAuth token (sk-ant-..., sk-...)"
              aria-label="API key or OAuth token"
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none"
            />
            <button
              onClick={handleSaveKey}
              disabled={keySaving || !keyInput.trim()}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {keySaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {detectedKeyType ? (
            <p className="text-xs text-zinc-400">Detected: <span className="text-zinc-300">{detectedKeyType}</span></p>
          ) : null}
          {keyError ? <p className="text-xs text-red-400">{keyError}</p> : null}
          <p className="text-xs text-zinc-600">
            Anthropic: <code className="text-zinc-500">sk-ant-api...</code> (Console) or <code className="text-zinc-500">sk-ant-oat01-...</code> (OAuth via <code className="text-zinc-500">claude setup-token</code>).
            OpenAI: <code className="text-zinc-500">sk-...</code>
          </p>
        </div>
      </section>

      {/* Channel Configuration */}
      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Channel Configuration</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Telegram', 'Discord', 'WhatsApp'].map((channel) => (
            <div key={channel} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-400">
              <span>{channel}</span>
              <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">Coming Soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* OpenClaw Gateway Instance Management */}
      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">OpenClaw Gateway</h2>

        {instanceLoading ? (
          <p className="text-sm text-zinc-400">Loading instance status...</p>
        ) : instance ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusDot(instance.status)}`} />
              <span className="text-sm font-medium capitalize text-zinc-200">{instance.status}</span>
              {instance.fly_region ? (
                <span className="text-xs text-zinc-500">({instance.fly_region})</span>
              ) : null}
            </div>

            {instance.gateway_url && instance.status === 'running' ? (
              <div className="space-y-2">
                <a
                  href="/api/gateway/open"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Open OpenClaw
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <p className="break-all text-center text-xs text-zinc-500">{instance.gateway_url}</p>
              </div>
            ) : null}

            {gatewayToken && instance.status === 'running' ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="mb-1 text-xs text-zinc-500">Access Token</p>
                <div className="flex items-center gap-2">
                  <code className="break-all text-sm text-zinc-200">
                    {gatewayToken.slice(0, 8)}...{gatewayToken.slice(-4)}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(gatewayToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-600">Use this token when first connecting to your OpenClaw Control UI.</p>
              </div>
            ) : null}

            {instance.status === 'provisioning' ? (
              <p className="text-sm text-yellow-400">Provisioning your gateway... This may take up to 30 seconds.</p>
            ) : null}

            {instance.error_message ? (
              <p className="text-sm text-red-400">{instance.error_message}</p>
            ) : null}

            <div className="flex gap-2 pt-2">
              {instance.status === 'error' ? (
                <button
                  onClick={handleProvision}
                  disabled={isProvisioning}
                  className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold disabled:opacity-70"
                >
                  {isProvisioning ? 'Retrying...' : 'Retry Provisioning'}
                </button>
              ) : null}
              {instance.status === 'running' || instance.status === 'error' ? (
                <button
                  onClick={handleDestroy}
                  disabled={isDestroying}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-70"
                >
                  {isDestroying ? 'Destroying...' : 'Destroy Instance'}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-1 text-sm text-gray-300">No gateway instance provisioned.</p>
            <p className="mb-4 text-sm text-gray-400">
              Deploy your personal OpenClaw Gateway — a 24/7 AI assistant with 20+ messaging channels, persistent memory, and cron jobs.
            </p>
            {subActive ? (
              <button
                onClick={handleProvision}
                disabled={isProvisioning}
                className="rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProvisioning ? 'Provisioning...' : 'Deploy Gateway'}
              </button>
            ) : (
              <p className="text-sm text-zinc-500">Subscribe to OpenClaws Pro below to deploy your gateway.</p>
            )}
          </div>
        )}

        {instanceError ? <p className="mt-3 text-sm text-red-400">{instanceError}</p> : null}
      </section>

      {/* Danger Zone */}
      {instance && (instance.status === 'running' || instance.status === 'error') ? (
        <section className="rounded-xl border border-red-500/20 bg-[#111111] p-5">
          <h2 className="mb-2 text-lg font-semibold text-red-400">Danger Zone</h2>
          <p className="mb-4 text-sm text-zinc-400">Irreversible actions — proceed with caution.</p>
          <button
            onClick={handleDestroy}
            disabled={isDestroying}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-70"
          >
            {isDestroying ? 'Deleting...' : 'Delete OpenClaw Instance'}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Permanently deletes your instance, all messages, memories, and cron jobs.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-2 text-lg font-semibold">Billing</h2>
        {subActive ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-medium text-emerald-300">OpenClaws Pro — Active</p>
            </div>
            <p className="mb-4 text-sm text-gray-400">$29/month. Your subscription is active.</p>
          </>
        ) : subStatus === 'past_due' ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <p className="text-sm font-medium text-yellow-300">Payment Past Due</p>
            </div>
            <p className="mb-4 text-sm text-red-400">Please update your payment method to avoid service interruption.</p>
          </>
        ) : (
          <>
            <p className="mb-1 text-sm text-gray-300">OpenClaws Pro — $29/month</p>
            <p className="mb-4 text-sm text-gray-400">Subscribe to deploy your personal AI gateway with 1000+ integrations.</p>
            <button
              onClick={handleUpgrade}
              disabled={isRedirecting}
              className="rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRedirecting ? 'Redirecting...' : 'Subscribe — $29/month'}
            </button>
          </>
        )}
        {upgraded ? <p className="mt-3 text-sm text-emerald-400">Subscription activated. Welcome to OpenClaws Pro.</p> : null}
        {cancelled ? <p className="mt-3 text-sm text-yellow-400">Checkout cancelled. You can try again anytime.</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>
    </div>
  );
}
