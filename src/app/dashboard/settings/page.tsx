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
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
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
  const [approvingDevice, setApprovingDevice] = useState(false);
  const [deviceApproved, setDeviceApproved] = useState(false);
  const [deviceApproveError, setDeviceApproveError] = useState<string | null>(null);
  const [gatewayToken, setGatewayToken] = useState<string | null>(null);

  // Model state
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [modelLoading, setModelLoading] = useState(false);

  // Provider keys state
  const [providerKeys, setProviderKeys] = useState<ProviderKeyInfo[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState('managed');

  // Agent config state
  const [agentName, setAgentName] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  // Channel config state
  type ChannelInfo = { configured: boolean; type: string };
  const [channels, setChannels] = useState<Record<string, ChannelInfo>>({});
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [channelSaving, setChannelSaving] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channelSuccess, setChannelSuccess] = useState<string | null>(null);

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

  const fetchChannels = useCallback(async () => {
    if (!instance || instance.status !== 'running') return;
    setChannelsLoading(true);
    try {
      const res = await fetch('/api/channels');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) return;
      const data = (await res.json()) as { channels: Record<string, ChannelInfo> };
      setChannels(data.channels);
    } catch {
      // Non-fatal
    } finally {
      setChannelsLoading(false);
    }
  }, [instance]);

  const handleSaveChannel = useCallback(async (channel: string, config: Record<string, unknown>) => {
    setChannelSaving(channel);
    setChannelError(null);
    setChannelSuccess(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, config }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save channel');
      setChannelSuccess(`${channel} configured successfully! Your agent will restart in a few seconds.`);
      setTimeout(() => setChannelSuccess(null), 5000);
      await fetchChannels();
      if (channel === 'telegram') setTelegramToken('');
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to save channel');
    } finally {
      setChannelSaving(null);
    }
  }, [fetchChannels]);

  const handleRemoveChannel = useCallback(async (channel: string) => {
    if (!confirm(`Remove ${channel} channel configuration?`)) return;
    setChannelSaving(channel);
    setChannelError(null);
    try {
      const res = await fetch(`/api/channels?channel=${channel}`, { method: 'DELETE' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to remove channel');
      await fetchChannels();
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to remove channel');
    } finally {
      setChannelSaving(null);
    }
  }, [fetchChannels]);

  const fetchAgentConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-config');
      if (!res.ok) return;
      const data = (await res.json()) as { config: { systemPrompt?: string; name?: string } };
      if (data.config?.name) setAgentName(data.config.name);
      if (data.config?.systemPrompt) setAgentPrompt(data.config.systemPrompt);
    } catch {
      // Non-fatal
    }
  }, []);

  const saveAgentConfig = useCallback(async () => {
    setAgentSaving(true);
    setAgentSaved(false);
    try {
      const res = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, systemPrompt: agentPrompt }),
      });
      if (res.ok) {
        setAgentSaved(true);
        setTimeout(() => setAgentSaved(false), 3000);
      }
    } catch {
      // Non-fatal
    } finally {
      setAgentSaving(false);
    }
  }, [agentName, agentPrompt]);

  useEffect(() => {
    fetchInstance();
    fetchKeys();
    fetchModel();
    fetchSubscription();
    fetchAgentConfig();
  }, [fetchInstance, fetchKeys, fetchModel, fetchSubscription, fetchAgentConfig]);

  // Fetch token and channels when instance is running
  useEffect(() => {
    if (instance?.status === 'running') {
      fetchToken();
      fetchChannels();
    }
  }, [instance?.status, fetchToken, fetchChannels]);

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
      stopped: 'bg-[var(--oc-muted)]',
      deleting: 'bg-[var(--oc-muted)] animate-pulse',
    };
    return colors[status] ?? 'bg-[var(--oc-muted)]';
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
      <div className="flex items-center justify-between rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-white">Settings</h1>
        <p className="text-xs text-[var(--oc-muted)]">Configure model, keys, and billing</p>
      </div>

      {/* Model Selection */}
      <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
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
                    ? 'border-[var(--oc-accent)] bg-[var(--oc-accent-subtle)] text-white'
                    : needsKey
                      ? 'cursor-not-allowed border-[var(--oc-border)] bg-[var(--oc-bg-accent)] text-[var(--oc-muted-strong)]'
                      : 'border-[var(--oc-border)] bg-[var(--oc-card)] text-[var(--oc-text)] hover:bg-[var(--oc-bg-hover)]'
                }`}
              >
                <span>{model.label}</span>
                {needsKey ? (
                  <span className="mt-1 block text-xs text-[var(--oc-muted-strong)]">Add API key below</span>
                ) : null}
              </button>
            );
          })}
        </div>

      </section>

      {/* Connect Your AI Account */}
      <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
        <h2 className="mb-1 text-lg font-semibold">Connect Your AI Account</h2>
        <p className="mb-4 text-xs text-[var(--oc-muted-strong)]">
          Link your AI provider account so OpenClaws can use your models.
        </p>

        {/* Existing keys */}
        {providerKeys.length > 0 ? (
          <div className="mb-4 space-y-2">
            {providerKeys.map((key) => (
              <div key={key.provider} className="flex items-center justify-between rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${key.validated ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <div>
                    <span className="text-sm font-medium capitalize text-[var(--oc-text)]">{key.provider}</span>
                    <span className="ml-2 text-xs text-[var(--oc-muted)]">
                      {key.keyType === 'oauth_token' ? 'OAuth' : 'API Key'} {key.keySuffix}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleValidateKey(key.provider)}
                    disabled={validatingProvider === key.provider}
                    className="text-xs text-[var(--oc-muted)] hover:text-white disabled:opacity-50"
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
              placeholder="Paste your OAuth token or API key"
              aria-label="OAuth token or API key"
              className="flex-1 rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] px-4 py-2 text-sm text-[var(--oc-text)] placeholder:text-[var(--oc-muted-strong)] focus:border-[var(--oc-border-strong)] focus:outline-none"
            />
            <button
              onClick={handleSaveKey}
              disabled={keySaving || !keyInput.trim()}
              className="rounded-lg bg-[var(--oc-accent)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {keySaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {detectedKeyType ? (
            <p className="text-xs text-[var(--oc-muted)]">Detected: <span className="text-[var(--oc-text)]">{detectedKeyType}</span></p>
          ) : null}
          {keyError ? <p className="text-xs text-red-400">{keyError}</p> : null}
          <p className="text-xs text-[var(--oc-muted-strong)]">
            Anthropic: paste your OAuth token (<code className="text-[var(--oc-muted)]">sk-ant-oat01-...</code>) from the Anthropic Console.
            OpenAI: <code className="text-[var(--oc-muted)]">sk-...</code>
          </p>
        </div>
      </section>

      {/* OpenClaw Gateway Instance Management */}
      <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
        <h2 className="mb-4 text-lg font-semibold">OpenClaw Gateway</h2>

        {instanceLoading ? (
          <p className="text-sm text-[var(--oc-muted)]">Loading instance status...</p>
        ) : instance ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusDot(instance.status)}`} />
              <span className="text-sm font-medium capitalize text-[var(--oc-text)]">{instance.status}</span>
              {instance.fly_region ? (
                <span className="text-xs text-[var(--oc-muted)]">({instance.fly_region})</span>
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
                <p className="break-all text-center text-xs text-[var(--oc-muted-strong)] select-none">{instance.gateway_url}</p>
                <p className="text-center text-[10px] text-[var(--oc-muted-strong)]">Always use the button above — it handles authentication automatically</p>
                <button
                  onClick={async () => {
                    setApprovingDevice(true);
                    try {
                      const res = await fetch('/api/gateway/approve-pairing', { method: 'POST' });
                      const data = await res.json().catch(() => ({})) as { approved?: boolean; message?: string; error?: string };
                      if (data.approved) {
                        setDeviceApproved(true);
                        setTimeout(() => setDeviceApproved(false), 3000);
                      } else {
                        setDeviceApproveError(data.message ?? data.error ?? 'No pending requests');
                        setTimeout(() => setDeviceApproveError(null), 3000);
                      }
                    } catch {
                      setDeviceApproveError('Failed to approve');
                      setTimeout(() => setDeviceApproveError(null), 3000);
                    } finally {
                      setApprovingDevice(false);
                    }
                  }}
                  disabled={approvingDevice}
                  className="mt-1 w-full rounded-lg border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] px-4 py-2 text-xs text-[var(--oc-muted)] transition-colors hover:bg-[var(--oc-bg-hover)] hover:text-[var(--oc-text)] disabled:opacity-50"
                >
                  {approvingDevice ? 'Approving…' : deviceApproved ? 'Device approved — refresh gateway' : deviceApproveError ?? 'Seeing "pairing required"? Click to approve your device'}
                </button>
              </div>
            ) : null}

            {gatewayToken && instance.status === 'running' ? (
              <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] p-3">
                <p className="mb-1 text-xs text-[var(--oc-muted)]">Access Token</p>
                <div className="flex items-center gap-2">
                  <code className="break-all text-sm text-[var(--oc-text)]">
                    {gatewayToken.slice(0, 8)}...{gatewayToken.slice(-4)}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(gatewayToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="text-xs text-[var(--oc-muted)] hover:text-white"
                  >
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--oc-muted-strong)]">Use this token when first connecting to your OpenClaw Control UI.</p>
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
                  className="rounded-lg bg-[var(--oc-accent)] px-4 py-2 text-sm font-semibold disabled:opacity-70"
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
                className="rounded-lg bg-[var(--oc-accent)] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProvisioning ? 'Provisioning...' : 'Deploy Gateway'}
              </button>
            ) : (
              <p className="text-sm text-[var(--oc-muted)]">Subscribe to OpenClaws Pro below to deploy your gateway.</p>
            )}
          </div>
        )}

        {instanceError ? <p className="mt-3 text-sm text-red-400">{instanceError}</p> : null}
      </section>

      {/* Channel Configuration */}
      {instance && instance.status === 'running' ? (
        <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
          <h2 className="mb-1 text-lg font-semibold">Channel Configuration</h2>
          <p className="mb-4 text-xs text-[var(--oc-muted)]">
            Connect messaging channels so your agent can chat with you on Telegram, Discord, and more.
          </p>

          {channelsLoading ? (
            <p className="text-sm text-[var(--oc-muted)]">Loading channels...</p>
          ) : (
            <div className="space-y-4">
              {/* Telegram */}
              <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-[#26A5E4]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium text-[var(--oc-text)]">Telegram</span>
                      {channels.telegram?.configured ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Connected
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {channels.telegram?.configured ? (
                    <button
                      onClick={() => handleRemoveChannel('telegram')}
                      disabled={channelSaving === 'telegram'}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                {!channels.telegram?.configured ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[var(--oc-muted)]">
                      1. Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#26A5E4] hover:underline">@BotFather</a> on Telegram
                      → <code className="text-[var(--oc-muted)]">/newbot</code> → copy the token
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={telegramToken}
                        onChange={(e) => { setTelegramToken(e.target.value); setChannelError(null); }}
                        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                        className="flex-1 rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] px-3 py-2 text-sm text-[var(--oc-text)] placeholder:text-[var(--oc-muted-strong)] focus:border-[var(--oc-border-strong)] focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveChannel('telegram', { token: telegramToken.trim() })}
                        disabled={channelSaving === 'telegram' || !telegramToken.trim()}
                        className="rounded-lg bg-[#26A5E4] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {channelSaving === 'telegram' ? 'Saving...' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Discord - placeholder for future */}
              <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-[var(--oc-muted)]">Discord</span>
                    <span className="ml-2 text-xs text-[var(--oc-muted-strong)]">Coming soon</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp - placeholder for future */}
              <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-[var(--oc-muted)]">WhatsApp</span>
                    <span className="ml-2 text-xs text-[var(--oc-muted-strong)]">Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {channelError ? <p className="mt-3 text-xs text-red-400">{channelError}</p> : null}
          {channelSuccess ? <p className="mt-3 text-xs text-emerald-400">{channelSuccess}</p> : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
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
              className="rounded-lg bg-[var(--oc-accent)] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRedirecting ? 'Redirecting...' : 'Subscribe — $29/month'}
            </button>
          </>
        )}
        {upgraded ? <p className="mt-3 text-sm text-emerald-400">Subscription activated. Welcome to OpenClaws Pro.</p> : null}
        {cancelled ? <p className="mt-3 text-sm text-yellow-400">Checkout cancelled. You can try again anytime.</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      {/* Personalize Your Agent */}
      <section className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-elevated)] p-5">
        <h2 className="mb-1 text-lg font-semibold">Personalize Your Agent</h2>
        <p className="mb-4 text-xs text-[var(--oc-muted)]">
          Customize how your AI assistant behaves across both the dashboard chat and Control UI.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="agent-name" className="mb-1 block text-xs text-[var(--oc-muted)]">Agent Name</label>
            <input
              id="agent-name"
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="OpenClaws Agent"
              className="w-full rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] px-3 py-2 text-sm text-white placeholder:text-[var(--oc-muted-strong)] focus:border-[var(--oc-border-strong)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="agent-prompt" className="mb-1 block text-xs text-[var(--oc-muted)]">System Prompt</label>
            <textarea
              id="agent-prompt"
              rows={4}
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder="You are the user's AI assistant. Be concise, helpful, and direct..."
              className="w-full resize-none rounded-lg border border-[var(--oc-border)] bg-[var(--oc-card)] px-3 py-2 text-sm text-white placeholder:text-[var(--oc-muted-strong)] focus:border-[var(--oc-border-strong)] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[var(--oc-muted-strong)]">{agentPrompt.length}/10,000</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveAgentConfig}
              disabled={agentSaving}
              className="rounded-lg bg-[var(--oc-bg-hover)] px-4 py-2 text-sm font-semibold text-[var(--oc-text-strong)] transition hover:bg-[var(--oc-bg-hover)] disabled:opacity-50"
            >
              {agentSaving ? 'Saving...' : 'Save'}
            </button>
            {agentSaved ? (
              <span className="text-xs text-emerald-400">Saved</span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
