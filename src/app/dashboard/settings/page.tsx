'use client';

import { useCallback, useEffect, useState } from 'react';

type InstanceData = {
  id: string;
  user_id: string;
  fly_app_name: string | null;
  fly_machine_id: string | null;
  fly_region: string;
  gateway_url: string | null;
  gateway_token: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUpgraded(params.get('upgraded') === 'true');
    setCancelled(params.get('cancelled') === 'true');
  }, []);

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/instance');
      if (!res.ok) throw new Error('Failed to fetch instance');
      const data = (await res.json()) as { instance: InstanceData | null };
      setInstance(data.instance);
      setInstanceError(null);
    } catch (err) {
      setInstanceError(err instanceof Error ? err.message : 'Failed to load instance');
    } finally {
      setInstanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  // Poll while provisioning
  useEffect(() => {
    if (instance?.status !== 'provisioning') return;
    const interval = setInterval(fetchInstance, 5000);
    return () => clearInterval(interval);
  }, [instance?.status, fetchInstance]);

  const handleProvision = async () => {
    setIsProvisioning(true);
    setInstanceError(null);
    try {
      const res = await fetch('/api/instance', { method: 'POST' });
      const data = (await res.json()) as { instance?: InstanceData; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Provisioning failed');
      setInstance(data.instance ?? null);
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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Destruction failed');
      }
      setInstance(null);
    } catch (err) {
      setInstanceError(err instanceof Error ? err.message : 'Destruction failed');
    } finally {
      setIsDestroying(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsRedirecting(true);
      setError(null);
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
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

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-white">Settings</h1>
        <p className="text-xs text-zinc-400">Configure model, channel, and billing</p>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Model Selection</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Claude Opus 4.5', 'GPT-4o', 'Gemini 2.5'].map((model) => (
            <button key={model} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm hover:bg-white/10">{model}</button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Channel Configuration</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Telegram', 'Discord', 'WhatsApp'].map((channel) => (
            <button key={channel} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm hover:bg-white/10">{channel}</button>
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
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusDot(instance.status)}`} />
              <span className="text-sm font-medium capitalize text-zinc-200">{instance.status}</span>
              {instance.fly_region ? (
                <span className="text-xs text-zinc-500">({instance.fly_region})</span>
              ) : null}
            </div>

            {/* Gateway URL */}
            {instance.gateway_url && instance.status === 'running' ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="mb-1 text-xs text-zinc-500">Gateway URL</p>
                <a
                  href={instance.gateway_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm text-blue-400 hover:text-blue-300"
                >
                  {instance.gateway_url}
                </a>
              </div>
            ) : null}

            {/* Gateway Token */}
            {instance.gateway_token && instance.status === 'running' ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="mb-1 text-xs text-zinc-500">Gateway Token</p>
                <div className="flex items-center gap-2">
                  <code className="break-all text-sm text-zinc-200">
                    {instance.gateway_token.slice(0, 8)}...{instance.gateway_token.slice(-4)}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(instance.gateway_token!);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Provisioning message */}
            {instance.status === 'provisioning' ? (
              <p className="text-sm text-yellow-400">Provisioning your gateway... This may take up to 30 seconds.</p>
            ) : null}

            {/* Error message */}
            {instance.error_message ? (
              <p className="text-sm text-red-400">{instance.error_message}</p>
            ) : null}

            {/* Actions */}
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
            <button
              onClick={handleProvision}
              disabled={isProvisioning}
              className="rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProvisioning ? 'Provisioning...' : 'Deploy Gateway'}
            </button>
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
        <p className="mb-1 text-sm text-gray-300">OpenClaws Pro - $29/month</p>
        <p className="mb-4 text-sm text-gray-400">Unlock premium models and unlimited automation.</p>
        <button
          onClick={handleUpgrade}
          disabled={isRedirecting}
          className="rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRedirecting ? 'Redirecting...' : 'Upgrade to Premium'}
        </button>
        {upgraded ? <p className="mt-3 text-sm text-emerald-400">Subscription activated. Welcome to OpenClaws Pro.</p> : null}
        {cancelled ? <p className="mt-3 text-sm text-yellow-400">Checkout cancelled. You can try again anytime.</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>
    </div>
  );
}
