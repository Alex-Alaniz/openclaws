'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type SubData = {
  active: boolean;
  status: string;
  currentPeriodEnd: string | null;
};

export default function UsagePage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

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
                Detailed usage metrics and cost breakdowns are coming soon. Your subscription covers unlimited gateway access.
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
      </div>
    </div>
  );
}
