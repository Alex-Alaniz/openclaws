'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackToolkitConnectStarted, trackToolkitConnectCompleted } from '@/lib/analytics';

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
  'semrush', 'mem0', 'neon', 'openweathermap', 'posthog', 'clickup', 'brevo', 'stripe', 'klaviyo', 'browserbase',
  'mailchimp', 'attio', 'googlemeet', 'text_to_pdf', 'zoho', 'fireflies', 'dropbox', 'shortcut', 'confluence', 'freshdesk',
  'borneo', 'mixpanel', 'coda', 'acculynx', 'ahrefs', 'affinity', 'amplitude', 'heygen', 'agencyzoom', 'googlebigquery',
  'microsoft_clarity', 'coinbase', 'monday', 'semanticscholar', 'sendgrid', 'junglescout', 'pipedrive', 'bamboohr', 'whatsapp',
  'dynamics365', 'zendesk', 'googlephotos', 'lmnt', 'metaads', 'zenrows', 'googlesuper', 'browser_tool', 'youcom',
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
  '#5A67FF', '#18A0FB', '#0EA5E9', '#14B8A6', '#22C55E', '#84CC16',
  '#F59E0B', '#F97316', '#F43F5E', '#E11D48', '#A855F7', '#7C3AED',
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
  google_analytics: ['#F9AB00', '#E37400'],
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
  browser_tool: ['#8B5CF6', '#3B82F6'],
  peopledatalabs: ['#4F46E5', '#2563EB'],
  microsoft_teams: ['#6264A7', '#8B8CC7'],
  microsoft_clarity: ['#2563EB', '#60A5FA'],
  docusign: ['#FFCC00', '#F2A900'],
  salesforce: ['#00A1E0', '#64C4ED'],
  calendly: ['#4F46E5', '#7C3AED'],
  semrush: ['#FF642D', '#FF914D'],
  perplexityai: ['#00C2FF', '#9BE7FF'],
  firecrawl: ['#EF4444', '#F59E0B'],
  tavily: ['#16A34A', '#4ADE80'],
  serpapi: ['#0EA5E9', '#22D3EE'],
  jira: ['#0052CC', '#4C9AFF'],
  exa: ['#14B8A6', '#2DD4BF'],
  semanticscholar: ['#2563EB', '#60A5FA'],
  one_drive: ['#0078D4', '#38BDF8'],
  composio: ['#7C3AED', '#A78BFA'],
  reddit: ['#FF4500', '#FF8B60'],
  bitbucket: ['#0052CC', '#2684FF'],
  hackernews: ['#FF6600', '#FF8533'],
  elevenlabs: ['#000000', '#6B7280'],
  apollo: ['#4F46E5', '#818CF8'],
  mailchimp: ['#FFE01B', '#F59E0B'],
  attio: ['#5A67FF', '#818CF8'],
  dropbox: ['#0061FF', '#3B82F6'],
  confluence: ['#1868DB', '#4C9AFF'],
  freshdesk: ['#04AA6D', '#2DD4BF'],
  coda: ['#F46A54', '#FF8A65'],
  whatsapp: ['#25D366', '#128C7E'],
  zendesk: ['#03363D', '#17494D'],
  facebook: ['#1877F2', '#4299E1'],
  webflow: ['#4353FF', '#818CF8'],
  todoist: ['#E44332', '#FF6B6B'],
  zoom: ['#2D8CFF', '#60A5FA'],
  miro: ['#FFD02F', '#F59E0B'],
  canva: ['#00C4CC', '#7B2FF7', '#FF7262'],
};

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const TRUSTCLAW_PRIORITY_INDEX = new Map(
  TRUSTCLAW_PRIORITY_SLUGS.map((slug, index) => [normalizeId(slug), index]),
);

function hexToRgb(hex: string) {
  const n = hex.replace('#', '');
  if (n.length !== 6) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveBrandStops(record: ToolkitApiRecord) {
  const candidates = [record.key, record.slug, record.name].map(normalizeId);
  for (const c of candidates) {
    const mapped = BRAND_STOPS_BY_TOOLKIT[c];
    if (mapped?.length) return [...mapped];
  }
  const hash = Array.from(record.key).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return [
    VIBRANT_FALLBACK_COLORS[hash % VIBRANT_FALLBACK_COLORS.length],
    VIBRANT_FALLBACK_COLORS[(hash + 3) % VIBRANT_FALLBACK_COLORS.length],
    VIBRANT_FALLBACK_COLORS[(hash + 6) % VIBRANT_FALLBACK_COLORS.length],
  ];
}

function buildBorderGradient(stops: readonly string[]): string {
  if (stops.length <= 2) {
    return `linear-gradient(180deg, ${withAlpha(stops[0], 0.95)} 0%, ${withAlpha(stops[stops.length - 1], 0.76)} 100%)`;
  }
  const step = 360 / stops.length;
  const parts = stops.map((c, i) => `${withAlpha(c, 0.93)} ${(i * step).toFixed(0)}deg`);
  parts.push(`${withAlpha(stops[0], 0.93)} 360deg`);
  return `conic-gradient(from var(--border-angle, 130deg), ${parts.join(', ')})`;
}

type ToolkitCard = ToolkitApiRecord & { brandColor: string; borderGradient: string };

function trustClawPriority(record: ToolkitApiRecord) {
  const candidates = [record.key, record.slug, record.name].map(normalizeId);
  for (const c of candidates) {
    const order = TRUSTCLAW_PRIORITY_INDEX.get(c);
    if (order !== undefined) return order;
  }
  return Number.POSITIVE_INFINITY;
}

function orderLikeTrustClaw(records: ToolkitApiRecord[]) {
  return [...records].sort((a, b) => {
    const d = trustClawPriority(a) - trustClawPriority(b);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
}

const DISPLAY_NAMES: Record<string, string> = {
  googlecalendar: 'Google Calendar', googlesheets: 'Google Sheets', googledrive: 'Google Drive',
  googledocs: 'Google Docs', googletasks: 'Google Tasks', googlemeet: 'Google Meet',
  googlephotos: 'Google Photos', googlebigquery: 'Google BigQuery', googleads: 'Google Ads',
  googlesuper: 'Google Super', google_analytics: 'Google Analytics', google_maps: 'Google Maps',
  perplexityai: 'Perplexity AI', codeinterpreter: 'Code Interpreter', composio_search: 'Composio Search',
  microsoft_teams: 'Microsoft Teams', microsoft_clarity: 'Microsoft Clarity', one_drive: 'OneDrive',
  peopledatalabs: 'People Data Labs', openweathermap: 'OpenWeatherMap', serpapi: 'SerpApi',
  hackernews: 'Hacker News', slackbot: 'Slack Bot', discordbot: 'Discord Bot', text_to_pdf: 'Text to PDF',
  browser_tool: 'Browser Tool', semanticscholar: 'Semantic Scholar', launch_darkly: 'LaunchDarkly',
  more_trees: 'More Trees', survey_monkey: 'SurveyMonkey', zoho_books: 'Zoho Books',
  zoho_inventory: 'Zoho Inventory', zoho_bigin: 'Zoho Bigin', zoho_desk: 'Zoho Desk',
  dropbox_sign: 'Dropbox Sign', hackerrank_work: 'HackerRank', process_street: 'Process Street',
  share_point: 'SharePoint', d2lbrightspace: 'D2L Brightspace', metaads: 'Meta Ads',
  retellai: 'Retell AI', recallai: 'Recall AI', metatextai: 'MetaText AI',
};

function getLogoUrl(slug: string) {
  return `https://logos.composio.dev/api/${slug}`;
}

function getDisplayName(slug: string) {
  return DISPLAY_NAMES[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function enrichCard(record: ToolkitApiRecord): ToolkitCard {
  const stops = resolveBrandStops(record);
  return { ...record, brandColor: stops[0], borderGradient: buildBorderGradient(stops) };
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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isAdvancingRef = useRef(false);
  const hoveredCardRef = useRef<HTMLElement | null>(null);

  const fetchToolkits = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true); else setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/composio/toolkits', { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/login'; return; }
      const payload = (await response.json().catch(() => null)) as ToolkitsApiResponse | { error?: string } | null;
      if (!response.ok) throw new Error(payload && 'error' in payload ? payload.error ?? 'Failed to fetch toolkits.' : 'Failed to fetch toolkits.');
      const records = payload && 'toolkits' in payload && Array.isArray(payload.toolkits) ? payload.toolkits : [];
      setToolkits(orderLikeTrustClaw(records).map(enrichCard));
    } catch {
      setError('Could not load toolkits from server. Showing defaults.');
      const mockRecords: ToolkitApiRecord[] = TRUSTCLAW_PRIORITY_SLUGS.map((slug) => ({
        key: slug,
        name: getDisplayName(slug),
        slug,
        logoUrl: getLogoUrl(slug),
        status: 'connect' as Status,
        connectedAccountId: null,
      }));
      setToolkits(mockRecords.map(enrichCard));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchToolkits(); }, [fetchToolkits]);

  useEffect(() => {
    const refreshOnFocus = () => { void fetchToolkits({ silent: true }); };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [fetchToolkits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return toolkits.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      const matchesTab = tab === 'All' || t.status === 'connected' || t.status === 'active';
      return matchesSearch && matchesTab;
    });
  }, [query, tab, toolkits]);

  const visibleToolkits = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(INITIAL_BATCH_SIZE); isAdvancingRef.current = false; }, [query, tab, toolkits.length]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || isAdvancingRef.current) return;
      isAdvancingRef.current = true;
      requestAnimationFrame(() => {
        setVisibleCount((prev) => Math.min(prev + LOAD_BATCH_SIZE, filtered.length));
        isAdvancingRef.current = false;
      });
    }, { root: null, rootMargin: '420px 0px 220px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, hasMore]);

  const handleConnect = useCallback(async (toolkitKey: string, appName: string) => {
    setPendingConnectKey(toolkitKey);
    setError(null);
    trackToolkitConnectStarted(toolkitKey);
    try {
      const response = await fetch('/api/composio/toolkits/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appName }),
      });
      if (response.status === 401) { window.location.href = '/login'; return; }
      const payload = (await response.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to start connection.');
      if (payload?.redirectUrl) {
        // Validate redirect URL before following it
        try {
          const url = new URL(payload.redirectUrl);
          const isLocalDev = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
          const isHttps = url.protocol === 'https:';
          const isSelfDomain = url.hostname === window.location.hostname || url.hostname.endsWith('.openclaws.biz');
          if ((!isHttps && !isLocalDev) || isSelfDomain) {
            throw new Error('Invalid redirect URL');
          }
        } catch {
          throw new Error('OAuth redirect could not be verified. Please try again.');
        }
        trackToolkitConnectCompleted(toolkitKey);
        window.location.href = payload.redirectUrl;
        return;
      }
      trackToolkitConnectCompleted(toolkitKey);
      await fetchToolkits({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start connection.');
    } finally {
      setPendingConnectKey(null);
    }
  }, [fetchToolkits]);

  const PROXIMITY_PX = 280;

  const handleGridPointerMove = useCallback((e: React.PointerEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>('.toolkit-card');
    const mx = e.clientX;
    const my = e.clientY;

    for (const card of cards) {
      if (card === hoveredCardRef.current) continue;

      const rect = card.getBoundingClientRect();
      const dx = Math.max(rect.left - mx, 0, mx - rect.right);
      const dy = Math.max(rect.top - my, 0, my - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PROXIMITY_PX && dist > 0) {
        // Exponential decay: nearby cards glow strongly, far cards glow faintly
        const t = 1 - dist / PROXIMITY_PX;
        const opacity = (0.55 * Math.pow(t, 1.5)).toFixed(3);

        const cx = Math.max(rect.left, Math.min(mx, rect.right));
        const cy = Math.max(rect.top, Math.min(my, rect.bottom));
        const rx = ((cx - rect.left) / rect.width - 0.5) * 2;
        const ry = ((cy - rect.top) / rect.height - 0.5) * 2;
        const angle = Math.atan2(ry, rx) * (180 / Math.PI) + 180;

        card.style.setProperty('--glow-opacity', opacity);
        card.style.setProperty('--pointer-x', rx.toFixed(3));
        card.style.setProperty('--pointer-y', ry.toFixed(3));
        card.style.setProperty('--border-angle', `${angle.toFixed(1)}deg`);
        const pctX = ((cx - rect.left) / rect.width * 100).toFixed(1);
        const pctY = ((cy - rect.top) / rect.height * 100).toFixed(1);
        card.style.setProperty('--cursor-px', `${pctX}%`);
        card.style.setProperty('--cursor-py', `${pctY}%`);
      } else if (dist >= PROXIMITY_PX) {
        card.style.setProperty('--glow-opacity', '0');
      }
    }
  }, []);

  const handleGridPointerLeave = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>('.toolkit-card');
    for (const card of cards) {
      if (card === hoveredCardRef.current) continue;
      card.style.setProperty('--glow-opacity', '0');
      card.style.setProperty('--pointer-x', '0');
      card.style.setProperty('--pointer-y', '0');
      card.style.setProperty('--border-angle', '130deg');
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white">
      <svg className="hidden" aria-hidden="true">
        <defs><filter id="toolkit-blur"><feGaussianBlur stdDeviation="16" /></filter></defs>
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
                aria-label={`Filter ${item.toLowerCase()} toolkits`}
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search across ${toolkits.length}+ toolkits...`}
              aria-label="Search toolkits"
              className="h-9 w-full rounded-md border border-white/[0.15] bg-white/[0.045] pl-9 pr-3 text-sm text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-1 focus:ring-white/[0.22]"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-md border border-white/10 bg-[#111111] px-4 py-8 text-center text-sm text-zinc-400">Loading toolkits...</div>
        ) : (
          <>
            <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" onPointerMove={handleGridPointerMove} onPointerLeave={handleGridPointerLeave}>
              {visibleToolkits.map((toolkit) => {
                const isConnecting = pendingConnectKey === toolkit.key;
                const logoUrl = toolkit.logoUrl || getLogoUrl(toolkit.slug);

                return (
                  <article
                    key={toolkit.key}
                    className="toolkit-card group relative aspect-square cursor-pointer rounded-xl border-[2px] border-transparent outline outline-1 outline-white/[0.06] transition-[translate,scale] duration-100 ease-[cubic-bezier(.645,.045,.355,1)] active:scale-[0.98]"
                    style={{
                      ['--pointer-x' as string]: '0',
                      ['--pointer-y' as string]: '0',
                      ['--border-angle' as string]: '130deg',
                      ['--glow-opacity' as string]: '0',
                      ['--cursor-px' as string]: '50%',
                      ['--cursor-py' as string]: '50%',
                    }}
                    onMouseEnter={(e) => {
                      hoveredCardRef.current = e.currentTarget;
                      e.currentTarget.style.setProperty('--glow-opacity', '0.85');
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const cx = (x / rect.width - 0.5) * 2;
                      const cy = (y / rect.height - 0.5) * 2;
                      const angle = Math.atan2(cy, cx) * (180 / Math.PI) + 180;
                      e.currentTarget.style.setProperty('--pointer-x', cx.toFixed(3));
                      e.currentTarget.style.setProperty('--pointer-y', cy.toFixed(3));
                      e.currentTarget.style.setProperty('--border-angle', `${angle.toFixed(1)}deg`);
                      e.currentTarget.style.setProperty('--glow-opacity', '0.85');
                      e.currentTarget.style.setProperty('--cursor-px', `${((x / rect.width) * 100).toFixed(1)}%`);
                      e.currentTarget.style.setProperty('--cursor-py', `${((y / rect.height) * 100).toFixed(1)}%`);
                    }}
                    onMouseLeave={(e) => {
                      hoveredCardRef.current = null;
                      e.currentTarget.style.setProperty('--pointer-x', '0');
                      e.currentTarget.style.setProperty('--pointer-y', '0');
                      e.currentTarget.style.setProperty('--border-angle', '130deg');
                      e.currentTarget.style.setProperty('--glow-opacity', '0');
                      e.currentTarget.style.setProperty('--cursor-px', '50%');
                      e.currentTarget.style.setProperty('--cursor-py', '50%');
                    }}
                  >
                    {/* Blurred logo follows pointer — ambient glow behind content */}
                    <div
                      className="pointer-events-none absolute inset-[-2px] overflow-hidden rounded-xl transition-opacity duration-300"
                      style={{ opacity: 'var(--glow-opacity, 0)' }}
                      aria-hidden="true"
                    >
                      <div
                        className="absolute inset-0 grid place-items-center will-change-transform"
                        style={{
                          filter: "url('#toolkit-blur') saturate(6) brightness(1.8) contrast(1.2)",
                          translate: 'calc(var(--pointer-x, 0) * 50%) calc(var(--pointer-y, 0) * 50%)',
                          scale: '3.6',
                        }}
                      >
                        <img alt="" className="h-16 w-16" draggable={false} src={logoUrl} />
                      </div>
                    </div>

                    {/* Content — background fades on hover to reveal blurred logo colors */}
                    <div className="relative z-[1] h-full rounded-[10px]">
                      <div className="absolute inset-0 rounded-[10px] bg-[#111111] transition-opacity duration-300" style={{ opacity: 'calc(1 - var(--glow-opacity, 0) * 0.706)' }} />
                      <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2.5 p-5">
                        {toolkit.status === 'connect' ? (
                          <div className="absolute right-3 top-3 z-[1]">
                            <button
                              onClick={(event) => { event.stopPropagation(); void handleConnect(toolkit.key, toolkit.key); }}
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
                        <img alt={`${toolkit.name} logo`} className="h-12 w-12 select-none" draggable={false} src={logoUrl} />
                        <h3 className="select-none text-[13px] font-bold tracking-tight text-white/90">{getDisplayName(toolkit.slug)}</h3>
                      </div>
                    </div>

                    {/* Brand border glow — radial spotlight follows cursor, clipped to 2px ring */}
                    <div
                      className="pointer-events-none absolute inset-[-2px] z-[2] rounded-xl transition-opacity duration-300"
                      style={{
                        opacity: 'min(calc(var(--glow-opacity, 0) * 1.4), 1)',
                        border: '2px solid transparent',
                        background: `radial-gradient(circle 120px at var(--cursor-px, 50%) var(--cursor-py, 50%), ${withAlpha(toolkit.brandColor, 1)} 0%, ${withAlpha(toolkit.brandColor, 0.6)} 35%, transparent 100%)`,
                        maskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        maskOrigin: 'border-box, padding-box',
                        maskClip: 'border-box, padding-box',
                        maskComposite: 'exclude',
                        WebkitMaskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        WebkitMaskOrigin: 'border-box, padding-box',
                        WebkitMaskClip: 'border-box, padding-box',
                        WebkitMaskComposite: 'xor',
                        filter: `drop-shadow(0 0 14px ${withAlpha(toolkit.brandColor, 0.6)})`,
                      }}
                    />
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#111111] px-4 py-8 text-center text-sm text-zinc-400">No toolkits match your search.</div>
            ) : null}
          </>
        )}

        {hasMore ? <div ref={sentinelRef} className="h-8 w-full" /> : null}
      </div>
    </div>
  );
}
