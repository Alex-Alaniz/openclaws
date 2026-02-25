'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

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
const TRUSTCLAW_PRIORITY_SLUGS = [
  'gmail', 'composio', 'github', 'googlecalendar', 'notion', 'googlesheets', 'slack', 'supabase', 'outlook', 'perplexityai',
  'twitter', 'googledrive', 'googledocs', 'hubspot', 'linear', 'airtable', 'codeinterpreter', 'serpapi', 'jira', 'firecrawl',
  'tavily', 'youtube', 'slackbot', 'canvas', 'bitbucket', 'googletasks', 'discord', 'figma', 'composio_search', 'reddit',
  'cal', 'wrike', 'exa', 'sentry', 'snowflake', 'hackernews', 'elevenlabs', 'microsoft_teams', 'asana', 'peopledatalabs',
  'shopify', 'linkedin', 'google_maps', 'one_drive', 'docusign', 'discordbot', 'salesforce', 'calendly', 'trello', 'apollo',
  'semrush', 'mem0', 'neon', 'weathermap', 'posthog', 'clickup', 'brevo', 'stripe', 'klaviyo', 'browserbase_tool',
  'mailchimp', 'attio', 'googlemeet', 'text_to_pdf', 'zoho', 'fireflies', 'dropbox', 'shortcut', 'confluence', 'freshdesk',
  'borneo', 'mixpanel', 'coda', 'acculynx', 'ahrefs', 'affinity', 'amplitude', 'heygen', 'agencyzoom', 'googlebigquery',
  'microsoft_clarity', 'coinbase', 'monday', 'semanticscholar', 'sendgrid', 'junglescout', 'pipedrive', 'bamboohr', 'whatsapp',
  'dynamics365', 'zendesk', 'googlephotos', 'lmnt', 'metaads', 'zenrows', 'googlesuper', 'browser_tool', 'yousearch',
  'linkup', 'listennotes', 'typefully', 'bolna', 'rocketlane', 'zoom', 'onepage', 'entelligence', 'retellai', 'servicenow',
  'googleads', 'pagerduty', 'toneden', 'rafflys', 'finage', 'fomo', 'bannerbear', 'miro', 'share_point', 'mocean', 'formcarry',
  'appdrag', 'metatextai', 'launch_darkly', 'mailerlite', 'contentful', 'close', 'docmosis', 'ably', 'more_trees', 'netsuite',
  'moz', 'recallai', 'apaleo', 'survey_monkey', 'zoho_books', 'zoho_inventory', 'facebook', 'tinypng', 'mopinion', 'crustdata',
  'webex', 'brandfetch', 'canva', 'digicert', 'dailybot', 'linkhut', 'dropbox_sign', 'timely', 'box', 'smugmug', 'productboard',
  'blackbaud', 'webflow', 'amcards', 'simplesat', 'hackerrank_work', 'freshbooks', 'process_street', 'chatwork', 'klipfolio',
  'demio', 'altoviz', 'd2lbrightspace', 'blackboard', 'lever', 'zoho_bigin', 'pandadoc', 'workiom', 'lexoffice', 'gorgias',
  'google_analytics', 'todoist', 'zoho_desk', 'ashby', 'datarobot', 'ngrok', 'square', 'yandex', 'baserow',
] as const;

const VIBRANT_FALLBACK_COLORS = [
  '#5A67FF',
  '#18A0FB',
  '#0EA5E9',
  '#14B8A6',
  '#22C55E',
  '#84CC16',
  '#F59E0B',
  '#F97316',
  '#F43F5E',
  '#E11D48',
  '#A855F7',
  '#7C3AED',
] as const;

const BRAND_STOPS_BY_TOOLKIT: Record<string, readonly string[]> = {
  gmail: ['#EA4335', '#FBBC05', '#34A853', '#4285F4'],
  googlecalendar: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
  googlesheets: ['#34A853', '#4285F4', '#FBBC05'],
  googledrive: ['#0F9D58', '#4285F4', '#F4B400'],
  googledocs: ['#4285F4', '#8AB4F8'],
  googletasks: ['#34A853', '#A8DAB5'],
  googlemeet: ['#0F9D58', '#4285F4'],
  googlemaps: ['#34A853', '#4285F4', '#FBBC05', '#EA4335'],
  googlephotos: ['#EA4335', '#FBBC05', '#34A853', '#4285F4'],
  googlebigquery: ['#669DF6', '#4A8AF4'],
  googleads: ['#34A853', '#4285F4', '#FBBC05'],
  googlesuper: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
  slack: ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'],
  slackbot: ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'],
  discord: ['#5865F2', '#99AAB5'],
  discordbot: ['#5865F2', '#99AAB5'],
  youtube: ['#FF0033', '#E62117'],
  canvas: ['#E72429', '#F4696B'],
  github: ['#ffffff', '#8892A0'],
  notion: ['#ffffff', '#A1A1AA'],
  supabase: ['#3ECF8E', '#249E6B'],
  outlook: ['#0A59D1', '#0078D4'],
  twitter: ['#1D9BF0', '#60B9FF'],
  linkedin: ['#0A66C2', '#7DB9FF'],
  linear: ['#8B5CF6', '#6D28D9'],
  airtable: ['#F82B60', '#FCB400', '#18BFFF'],
  figma: ['#F24E1E', '#A259FF', '#1ABCFE', '#0ACF83'],
  stripe: ['#635BFF', '#8A7DFF'],
  klaviyo: ['#FF5C35', '#FF8A65'],
  shopify: ['#7AB55C', '#95D47B'],
  hubspot: ['#FF7A59', '#FF9A7A'],
  sentry: ['#362D59', '#8C6DD7'],
  posthog: ['#F54E00', '#F5A400'],
  clickup: ['#7B68EE', '#FA4F96'],
  asana: ['#F06A6A', '#F8AE6A', '#AF8CFF'],
  trello: ['#0079BF', '#70B5F9'],
  monday: ['#FF3D57', '#FFCC00', '#00C875'],
  coinbase: ['#0052FF', '#6C8FFF'],
  mem0: ['#6D4AFF', '#A483FF'],
  neon: ['#00E599', '#00C28A'],
  browserbase: ['#7C3AED', '#A78BFA'],
  browsertool: ['#8B5CF6', '#3B82F6'],
  browserbasetool: ['#7C3AED', '#A78BFA'],
  peopledatalabs: ['#4F46E5', '#2563EB'],
  microsoftteams: ['#6264A7', '#8B8CC7'],
  microsoftclarity: ['#2563EB', '#60A5FA'],
  docusign: ['#FFCC00', '#F2A900'],
  salesforce: ['#00A1E0', '#64C4ED'],
  calendars: ['#4F46E5', '#7C3AED'],
  semrush: ['#FF642D', '#FF914D'],
  perpexityai: ['#00C2FF', '#9BE7FF'],
  perplexityai: ['#00C2FF', '#9BE7FF'],
  firecrawl: ['#EF4444', '#F59E0B'],
  tavily: ['#16A34A', '#4ADE80'],
  serpapi: ['#0EA5E9', '#22D3EE'],
  jira: ['#0052CC', '#4C9AFF'],
  exa: ['#14B8A6', '#2DD4BF'],
  sematicscholar: ['#2563EB', '#60A5FA'],
  semanticscholar: ['#2563EB', '#60A5FA'],
  one_drive: ['#0078D4', '#38BDF8'],
  onedrive: ['#0078D4', '#38BDF8'],
};

type ToolkitCard = ToolkitApiRecord & {
  edgeGradient: string;
  cornerColors: [string, string, string, string];
  auraGradient: string;
};

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const TRUSTCLAW_PRIORITY_INDEX = new Map(
  TRUSTCLAW_PRIORITY_SLUGS.map((slug, index) => [normalizeId(slug), index]),
);

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pickCornerColors(stops: readonly string[]): [string, string, string, string] {
  if (stops.length === 1) return [stops[0], stops[0], stops[0], stops[0]];
  if (stops.length === 2) return [stops[0], stops[1], stops[0], stops[1]];
  if (stops.length === 3) return [stops[0], stops[1], stops[2], stops[1]];
  return [stops[0], stops[1], stops[2], stops[3]];
}

function resolveBrandStops(record: ToolkitApiRecord) {
  const candidates = [record.key, record.slug, record.name].map((value) => normalizeId(value));
  for (const candidate of candidates) {
    const mapped = BRAND_STOPS_BY_TOOLKIT[candidate];
    if (mapped && mapped.length > 0) return [...mapped];
  }

  const hash = Array.from(record.key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const primary = VIBRANT_FALLBACK_COLORS[hash % VIBRANT_FALLBACK_COLORS.length];
  const secondary = VIBRANT_FALLBACK_COLORS[(hash + 3) % VIBRANT_FALLBACK_COLORS.length];
  const tertiary = VIBRANT_FALLBACK_COLORS[(hash + 6) % VIBRANT_FALLBACK_COLORS.length];
  return [primary, secondary, tertiary];
}

function buildEdgeGradient(stops: readonly string[]) {
  const colors = stops.length >= 3 ? stops : [stops[0], stops[0], stops[0]];
  const entries = [
    `${withAlpha(colors[0], 0.95)} 0%`,
    `${withAlpha(colors[1 % colors.length], 0.92)} 25%`,
    `${withAlpha(colors[2 % colors.length], 0.92)} 50%`,
    `${withAlpha(colors[1 % colors.length], 0.9)} 75%`,
    `${withAlpha(colors[0], 0.95)} 100%`,
  ];
  return `conic-gradient(from 135deg, ${entries.join(', ')})`;
}

function buildAuraGradient(corners: [string, string, string, string]) {
  return [
    `radial-gradient(95% 95% at 0% 0%, ${withAlpha(corners[0], 0.55)} 0%, ${withAlpha(corners[0], 0.18)} 36%, ${withAlpha(corners[0], 0)} 74%)`,
    `radial-gradient(95% 95% at 100% 0%, ${withAlpha(corners[1], 0.55)} 0%, ${withAlpha(corners[1], 0.18)} 36%, ${withAlpha(corners[1], 0)} 74%)`,
    `radial-gradient(95% 95% at 0% 100%, ${withAlpha(corners[2], 0.55)} 0%, ${withAlpha(corners[2], 0.18)} 36%, ${withAlpha(corners[2], 0)} 74%)`,
    `radial-gradient(95% 95% at 100% 100%, ${withAlpha(corners[3], 0.55)} 0%, ${withAlpha(corners[3], 0.18)} 36%, ${withAlpha(corners[3], 0)} 74%)`,
    'radial-gradient(85% 85% at 50% 50%, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 72%)',
  ].join(', ');
}

function trustClawPriority(record: ToolkitApiRecord) {
  const candidates = [record.key, record.slug, record.name].map((value) => normalizeId(value));
  for (const candidate of candidates) {
    const order = TRUSTCLAW_PRIORITY_INDEX.get(candidate);
    if (order !== undefined) return order;
  }
  return Number.POSITIVE_INFINITY;
}

function orderLikeTrustClaw(records: ToolkitApiRecord[]) {
  return [...records].sort((left, right) => {
    const leftPriority = trustClawPriority(left);
    const rightPriority = trustClawPriority(right);

    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.name.localeCompare(right.name);
  });
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function applyCardLighting(card: HTMLElement, clientX: number, clientY: number) {
  const rect = card.getBoundingClientRect();
  const x = clamp((clientX - rect.left) / rect.width);
  const y = clamp((clientY - rect.top) / rect.height);

  const edgeDistance = Math.min(x, 1 - x, y, 1 - y);
  const edgeProximity = clamp(1 - edgeDistance / 0.23);

  const cornerDistance = Math.min(
    Math.hypot(x, y),
    Math.hypot(1 - x, y),
    Math.hypot(x, 1 - y),
    Math.hypot(1 - x, 1 - y),
  );
  const cornerProximity = clamp(1 - cornerDistance / 0.46);

  const centerDistance = Math.hypot(x - 0.5, y - 0.5) / 0.70710678118;
  const centerProximity = clamp(1 - centerDistance);

  const edgeAlpha = clamp(0.34 + edgeProximity * 0.5 + cornerProximity * 0.16, 0, 1);
  const cornerAlpha = clamp(0.22 + cornerProximity * 0.78, 0, 1);
  const auraAlpha = clamp(0.14 + centerProximity * 0.3 + edgeProximity * 0.18, 0, 0.9);
  const edgeBright = clamp(0.52 + edgeProximity * 0.72 + cornerProximity * 0.26, 0, 1.8);
  const edgeBloom = 2 + edgeProximity * 8 + cornerProximity * 5;
  const cornerBloom = 5 + cornerProximity * 8;
  const cornerBlur = 0.7 + cornerProximity * 0.95;

  card.style.setProperty('--pointer-x', (x - 0.5).toFixed(3));
  card.style.setProperty('--pointer-y', (y - 0.5).toFixed(3));
  card.style.setProperty('--edge-alpha', edgeAlpha.toFixed(3));
  card.style.setProperty('--corner-alpha', cornerAlpha.toFixed(3));
  card.style.setProperty('--aura-alpha', auraAlpha.toFixed(3));
  card.style.setProperty('--edge-bright', edgeBright.toFixed(3));
  card.style.setProperty('--edge-bloom', `${edgeBloom.toFixed(2)}px`);
  card.style.setProperty('--corner-bloom', `${cornerBloom.toFixed(2)}px`);
  card.style.setProperty('--corner-blur', `${cornerBlur.toFixed(2)}px`);
}

function resetCardLighting(card: HTMLElement) {
  card.style.setProperty('--pointer-x', '0');
  card.style.setProperty('--pointer-y', '0');
  card.style.setProperty('--edge-alpha', '0');
  card.style.setProperty('--corner-alpha', '0');
  card.style.setProperty('--aura-alpha', '0');
  card.style.setProperty('--edge-bright', '0');
  card.style.setProperty('--edge-bloom', '0px');
  card.style.setProperty('--corner-bloom', '0px');
  card.style.setProperty('--corner-blur', '0.2px');
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
      const orderedRecords = orderLikeTrustClaw(records);
      setToolkits(
        orderedRecords.map((record) => {
          const brandStops = resolveBrandStops(record);
          const cornerColors = pickCornerColors(brandStops);
          return {
            ...record,
            edgeGradient: buildEdgeGradient(brandStops),
            cornerColors,
            auraGradient: buildAuraGradient(cornerColors),
          };
        }),
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
                const [topLeftColor, topRightColor, bottomLeftColor, bottomRightColor] = toolkit.cornerColors;
                return (
                  <article
                    key={toolkit.key}
                    className="toolkit-card group relative cursor-pointer rounded-xl border border-white/[0.12] bg-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,transform] duration-200 ease-out hover:border-white/[0.2] active:translate-y-px active:scale-[0.99]"
                    style={{
                      containerType: 'size',
                      aspectRatio: '1 / 1',
                      '--pointer-x': '0',
                      '--pointer-y': '0',
                      '--edge-alpha': '0',
                      '--corner-alpha': '0',
                      '--aura-alpha': '0',
                      '--edge-bright': '0',
                      '--edge-bloom': '0px',
                      '--corner-bloom': '0px',
                      '--corner-blur': '0.2px',
                    } as CSSProperties}
                    onMouseEnter={(event) => {
                      applyCardLighting(event.currentTarget, event.clientX, event.clientY);
                    }}
                    onMouseMove={(event) => {
                      applyCardLighting(event.currentTarget, event.clientX, event.clientY);
                    }}
                    onMouseLeave={(event) => {
                      resetCardLighting(event.currentTarget);
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl [clip-path:inset(0_round_12px)]">
                      <div className="absolute inset-0 bg-[#1a1a1a]" />

                      <div
                        className="pointer-events-none absolute inset-[1px] z-[1] rounded-[11px] transition-[opacity,filter] duration-300 ease-out"
                        style={{
                          background: toolkit.auraGradient,
                          opacity: 'calc(0.02 + var(--aura-alpha, 0) * 0.98)',
                          filter: 'saturate(1.26) brightness(1.1)',
                          mixBlendMode: 'screen',
                        }}
                      />

                      <div
                        className="pointer-events-none absolute inset-0 z-[1] grid place-items-center will-change-transform"
                        style={{
                          filter: "url('#toolkit-blur') saturate(5) brightness(1.3)",
                          translate: 'calc(var(--pointer-x, 0) * 42cqi) calc(var(--pointer-y, 0) * 42cqh)',
                          scale: '3.4',
                          opacity: 'calc(0.08 + var(--aura-alpha, 0) * 0.35)',
                          transition: 'opacity 300ms ease-out',
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
                          <div className="absolute right-3 top-3 z-[1] rounded bg-black/40 px-1.5 py-[1px] text-[10px] font-medium text-zinc-100">
                            {toolkit.status === 'active' ? 'Active' : 'Connected'}
                          </div>
                        )}

                        <img alt={`${toolkit.name} logo`} className="h-16 w-16 select-none" draggable={false} src={toolkit.logoUrl} />
                        <h3 className="select-none text-sm font-semibold text-zinc-100">{toolkit.name}</h3>
                      </div>
                    </div>

                    <div
                      className="pointer-events-none absolute inset-0 z-[3] rounded-xl"
                      style={{
                        background: toolkit.edgeGradient,
                        opacity: 'calc(0.12 + var(--edge-alpha, 0) * 0.88)',
                        padding: '1px',
                        filter:
                          'saturate(calc(1 + var(--edge-bright, 0) * 0.32)) brightness(calc(0.8 + var(--edge-bright, 0) * 0.42)) drop-shadow(0 0 var(--edge-bloom, 0px) rgba(255,255,255,0.12))',
                        transition: 'opacity 180ms ease-out, filter 180ms ease-out',
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

                    <div className="pointer-events-none absolute inset-0 z-[4] rounded-xl">
                      <div
                        className="absolute left-0 top-0 h-[17%] w-[17%] rounded-tl-xl"
                        style={{
                          borderTop: `2px solid ${withAlpha(topLeftColor, 1)}`,
                          borderLeft: `2px solid ${withAlpha(topLeftColor, 1)}`,
                          opacity: 'var(--corner-alpha, 0)',
                          filter: 'blur(var(--corner-blur, 0.2px))',
                          boxShadow: `0 0 var(--corner-bloom, 0px) 3px ${withAlpha(topLeftColor, 0.72)}`,
                          transition: 'opacity 150ms ease-out, box-shadow 150ms ease-out',
                        }}
                      />
                      <div
                        className="absolute right-0 top-0 h-[17%] w-[17%] rounded-tr-xl"
                        style={{
                          borderTop: `2px solid ${withAlpha(topRightColor, 1)}`,
                          borderRight: `2px solid ${withAlpha(topRightColor, 1)}`,
                          opacity: 'var(--corner-alpha, 0)',
                          filter: 'blur(var(--corner-blur, 0.2px))',
                          boxShadow: `0 0 var(--corner-bloom, 0px) 3px ${withAlpha(topRightColor, 0.72)}`,
                          transition: 'opacity 150ms ease-out, box-shadow 150ms ease-out',
                        }}
                      />
                      <div
                        className="absolute bottom-0 left-0 h-[17%] w-[17%] rounded-bl-xl"
                        style={{
                          borderBottom: `2px solid ${withAlpha(bottomLeftColor, 1)}`,
                          borderLeft: `2px solid ${withAlpha(bottomLeftColor, 1)}`,
                          opacity: 'var(--corner-alpha, 0)',
                          filter: 'blur(var(--corner-blur, 0.2px))',
                          boxShadow: `0 0 var(--corner-bloom, 0px) 3px ${withAlpha(bottomLeftColor, 0.72)}`,
                          transition: 'opacity 150ms ease-out, box-shadow 150ms ease-out',
                        }}
                      />
                      <div
                        className="absolute bottom-0 right-0 h-[17%] w-[17%] rounded-br-xl"
                        style={{
                          borderBottom: `2px solid ${withAlpha(bottomRightColor, 1)}`,
                          borderRight: `2px solid ${withAlpha(bottomRightColor, 1)}`,
                          opacity: 'var(--corner-alpha, 0)',
                          filter: 'blur(var(--corner-blur, 0.2px))',
                          boxShadow: `0 0 var(--corner-bloom, 0px) 3px ${withAlpha(bottomRightColor, 0.72)}`,
                          transition: 'opacity 150ms ease-out, box-shadow 150ms ease-out',
                        }}
                      />
                    </div>
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
