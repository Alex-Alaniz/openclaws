'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'All' | 'Connected';
type Status = 'connect' | 'connected' | 'active';

type ToolkitApiRecord = {
  key: string;
  name: string;
  slug: string;
  logoUrl: string;
  status: Status;
  connectedAccountId: string | null;
};

type ToolkitsApiResponse = {
  toolkits: ToolkitApiRecord[];
  counts: {
    total: number;
    connected: number;
    active: number;
  };
};

const INITIAL_BATCH_SIZE = 24;
const LOAD_BATCH_SIZE = 12;
const GLOW_COLORS = [
  '#EA4335',
  '#4285F4',
  '#34A853',
  '#FBBC05',
  '#635BFF',
  '#F24E1E',
  '#5E6AD2',
  '#5865F2',
  '#3ECF8E',
  '#0EA5E9',
  '#14B8A6',
  '#E11D48',
  '#F97316',
  '#8B5CF6',
] as const;

type ToolkitCard = ToolkitApiRecord & {
  cornerGlow: string;
};

function colorForToolkit(seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GLOW_COLORS[hash % GLOW_COLORS.length];
}

export default function ToolkitsPage() {
  const [tab, setTab] = useState<Tab>('All');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [toolkits, setToolkits] = useState<ToolkitCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingConnectKey, setPendingConnectKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isAdvancingRef = useRef(false);

  const fetchToolkits = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/composio/toolkits', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as ToolkitsApiResponse | { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload && 'error' in payload ? payload.error ?? 'Failed to fetch toolkits.' : 'Failed to fetch toolkits.');
      }

      const records =
        payload && 'toolkits' in payload && Array.isArray(payload.toolkits)
          ? payload.toolkits
          : [];
      setToolkits(
        records.map((record) => ({
          ...record,
          cornerGlow: colorForToolkit(record.key),
        })),
      );
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to fetch toolkits.';
      setError(message);
      setToolkits([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchToolkits();
  }, [fetchToolkits]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void fetchToolkits({ silent: true });
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [fetchToolkits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return toolkits.filter((toolkit) => {
      const matchesSearch = toolkit.name.toLowerCase().includes(q) || toolkit.slug.toLowerCase().includes(q);
      const matchesTab = tab === 'All' ? true : toolkit.status === 'connected' || toolkit.status === 'active';
      return matchesSearch && matchesTab;
    });
  }, [query, tab, toolkits]);

  const visibleToolkits = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
    isAdvancingRef.current = false;
  }, [query, tab, toolkits.length]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || isAdvancingRef.current) return;
      isAdvancingRef.current = true;
      requestAnimationFrame(() => {
        setVisibleCount((previous) => Math.min(previous + LOAD_BATCH_SIZE, filtered.length));
        isAdvancingRef.current = false;
      });
    }, { root: null, rootMargin: '420px 0px 220px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, hasMore]);

  const handleConnect = useCallback(
    async (toolkitKey: string, appName: string) => {
      setPendingConnectKey(toolkitKey);
      setError(null);

      try {
        const response = await fetch('/api/composio/toolkits/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appName }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { redirectUrl?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to start connection.');
        }

        if (payload?.redirectUrl) {
          window.location.href = payload.redirectUrl;
          return;
        }

        await fetchToolkits({ silent: true });
      } catch (connectError) {
        const message = connectError instanceof Error ? connectError.message : 'Failed to start connection.';
        setError(message);
      } finally {
        setPendingConnectKey(null);
      }
    },
    [fetchToolkits],
  );

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white">
      <svg className="hidden" aria-hidden="true">
        <defs><filter id="toolkit-blur"><feGaussianBlur stdDeviation="20" /></filter></defs>
      </svg>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Toolkits</h1>
          {isRefreshing && !isLoading ? <span className="text-[11px] text-zinc-500">Refreshing...</span> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-[#1f1f1f] p-[3px] text-zinc-400">
            {(['All', 'Connected'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                role="tab"
                aria-selected={tab === item}
                className={`relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium transition-all ${
                  tab === item
                    ? 'border-white/[0.15] bg-white/[0.045] text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search across ${toolkits.length}+ toolkits...`}
              className="h-9 w-full rounded-md border border-white/[0.15] bg-white/[0.045] pl-9 pr-3 text-sm text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-1 focus:ring-white/[0.22]"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-md border border-white/10 bg-[#111111] px-4 py-8 text-center text-sm text-zinc-400">
            Loading toolkits...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleToolkits.map((toolkit) => {
                const isConnecting = pendingConnectKey === toolkit.key;
                return (
                  <article
                    key={toolkit.key}
                    className="toolkit-card group relative cursor-pointer rounded-xl border-[2px] border-transparent bg-[#1a1a1a] outline outline-1 outline-white/10 transition-[translate,scale] duration-100 ease-[cubic-bezier(.645,.045,.355,1)] active:translate-y-px active:scale-[0.99]"
                    style={{ containerType: 'size', aspectRatio: '1 / 1' }}
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const x = (event.clientX - rect.left) / rect.width;
                      const y = (event.clientY - rect.top) / rect.height;
                      event.currentTarget.style.setProperty('--pointer-x', (x - 0.5).toFixed(3));
                      event.currentTarget.style.setProperty('--pointer-y', (y - 0.5).toFixed(3));
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.removeProperty('--pointer-x');
                      event.currentTarget.style.removeProperty('--pointer-y');
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl [clip-path:inset(0_round_12px)]">
                      <div
                        className="pointer-events-none absolute inset-0 grid place-items-center will-change-transform"
                        style={{
                          filter: "url('#toolkit-blur') saturate(5) brightness(1.3)",
                          translate: 'calc(var(--pointer-x, -10) * 50cqi) calc(var(--pointer-y, -10) * 50cqh)',
                          scale: '3.4',
                          opacity: 0.25,
                        }}
                      >
                        <img alt="" className="h-16 w-16" draggable={false} src={toolkit.logoUrl} />
                      </div>

                      <div className="relative z-[2] flex h-full flex-col items-center justify-center gap-1.5 p-4 pt-10">
                        {toolkit.status === 'connect' ? (
                          <div className="absolute right-3 top-3 z-[1]">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleConnect(toolkit.key, toolkit.key);
                              }}
                              className="inline-flex items-center justify-center whitespace-nowrap font-medium disabled:pointer-events-none disabled:opacity-50 shrink-0 rounded-md bg-white text-black hover:bg-white/90 gap-1.5 h-7 px-2.5 text-xs transition-all duration-200 group-hover:scale-105 group-hover:shadow-md"
                              disabled={isConnecting}
                            >
                              {isConnecting ? 'Connecting...' : 'Connect'}
                            </button>
                          </div>
                        ) : (
                          <div className="absolute right-3 top-3 z-[1]">
                            {toolkit.status === 'active' ? 'Active' : 'Connected'}
                          </div>
                        )}

                        <img alt={`${toolkit.name} logo`} className="h-16 w-16 select-none" draggable={false} src={toolkit.logoUrl} />
                        <h3 className="select-none text-sm font-semibold text-zinc-100">{toolkit.name}</h3>
                      </div>
                    </div>

                    <div
                      className="pointer-events-none absolute inset-0 z-[3] rounded-xl [clip-path:inset(0_round_12px)]"
                      style={{
                        border: '2px solid transparent',
                        backdropFilter: 'saturate(4.2) brightness(2.5) contrast(2.5)',
                        maskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        maskOrigin: 'border-box, padding-box',
                        maskClip: 'border-box, padding-box',
                        maskComposite: 'exclude',
                        WebkitMaskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        WebkitMaskOrigin: 'border-box, padding-box',
                        WebkitMaskClip: 'border-box, padding-box',
                        WebkitMaskComposite: 'xor',
                      }}
                    />

                    <div
                      className="pointer-events-none absolute inset-0 z-[4] rounded-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      style={{
                        background: `
                          radial-gradient(18px 18px at 0% 0%, ${toolkit.cornerGlow}, transparent 65%),
                          radial-gradient(18px 18px at 100% 0%, ${toolkit.cornerGlow}, transparent 65%),
                          radial-gradient(18px 18px at 0% 100%, ${toolkit.cornerGlow}, transparent 65%),
                          radial-gradient(18px 18px at 100% 100%, ${toolkit.cornerGlow}, transparent 65%)
                        `,
                        filter: 'blur(0.4px) saturate(1.2)',
                        mixBlendMode: 'screen',
                      }}
                    />
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#111111] px-4 py-8 text-center text-sm text-zinc-400">
                No toolkits match your search.
              </div>
            ) : null}
          </>
        )}

        {hasMore ? <div ref={sentinelRef} className="h-8 w-full" /> : null}
      </div>
    </div>
  );
}
