'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type SubData = {
  active: boolean;
  status: string;
  currentPeriodEnd: string | null;
};

type InstanceData = {
  status: string;
  gateway_url: string | null;
  fly_region: string | null;
  created_at: string;
};

export default function UsagePage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      if (!res.ok) return;
      const data = (await res.json()) as SubData;
      setSub(data);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/instance');
      if (!res.ok) return;
      const data = (await res.json()) as { instance: InstanceData | null };
      setInstance(data.instance ?? null);
    } catch {
      // Non-fatal
    } finally {
      setInstanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSub();
    fetchInstance();
  }, [fetchSub, fetchInstance]);

  const formatUptime = (createdAt?: string | null) => {
    if (!createdAt) return '—';
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return '—';
    const diffMs = Date.now() - created;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${Math.max(minutes, 0)}m`;
  };

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Usage</h1>

        <section className="rounded-xl border border-white/[0.1] bg-[#151515] p-5">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading subscription status...</p>
          ) : sub?.active ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-zinc-100">OpenClaws Pro</span>
                </div>
                <span className="text-sm text-zinc-400">$29/mo</span>
              </div>
              {periodEnd ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Current period ends {periodEnd}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-zinc-500">
                Your subscription covers unlimited gateway access. View detailed usage in the Control UI.
              </p>
            </>
          ) : sub?.status === 'past_due' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-sm font-semibold text-yellow-300">Payment Past Due</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Please update your payment method to continue using OpenClaws.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-500" />
                <span className="text-sm font-semibold text-zinc-300">No Active Subscription</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Subscribe to OpenClaws Pro to deploy your AI gateway.
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-block rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Subscribe — $29/month
              </Link>
            </>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.1] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {instanceLoading ? (
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-600 animate-pulse" />
              ) : instance?.status === 'running' ? (
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              ) : (
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
              )}
              <span className="text-sm font-semibold text-zinc-100">Gateway</span>
              {instance?.fly_region ? (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
                  {instance.fly_region}
                </span>
              ) : null}
            </div>
            <a
              href="/api/gateway/open"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              View detailed metrics in the Control UI
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/[0.06] bg-[#0f0f0f] p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Status</div>
              <div className="mt-1 font-mono text-xs text-zinc-100">
                {instanceLoading ? 'Checking…' : instance?.status ?? 'not deployed'}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-[#0f0f0f] p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Uptime</div>
              <div className="mt-1 font-mono text-xs text-zinc-100">{formatUptime(instance?.created_at)}</div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-[#0f0f0f] p-3 md:col-span-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Gateway URL</div>
              <div className="mt-1 truncate font-mono text-xs text-zinc-100">
                {instanceLoading ? 'Loading…' : instance?.gateway_url ?? '—'}
              </div>
            </div>
          </div>

          {!instanceLoading && !instance ? (
            <p className="mt-3 text-xs text-zinc-500">
              No gateway deployed yet. Deploy from Settings to start collecting metrics.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
