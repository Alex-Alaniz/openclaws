'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUpgraded(params.get('upgraded') === 'true');
    setCancelled(params.get('cancelled') === 'true');
  }, []);

  const handleUpgrade = async () => {
    try {
      setIsRedirecting(true);
      setError(null);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
      setIsRedirecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-white">Settings</h1>
        <p className="text-xs text-zinc-400">Configure model, channel, and billing</p>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Model Selection</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Claude Opus 4.5', 'GPT-4o', 'Gemini 2.5'].map((model) => <button key={model} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm hover:bg-white/10">{model}</button>)}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-semibold">Channel Configuration</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Telegram', 'Discord', 'WhatsApp'].map((channel) => <button key={channel} className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm hover:bg-white/10">{channel}</button>)}
        </div>
      </section>
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
