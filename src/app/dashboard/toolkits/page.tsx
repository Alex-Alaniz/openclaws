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

function mixHex(hexA: string, hexB: string, ratio = 0.5) {
  const weight = clamp(ratio, 0, 1);
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * weight);
  const g = Math.round(a.g + (b.g - a.g) * weight);
  const bChannel = Math.round(a.b + (b.b - a.b) * weight);
  return `#${[r, g, bChannel].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function pickCornerColors(stops: readonly string[]): [string, string, string, string] {
  if (stops.length === 1) return [stops[0], stops[0], stops[0], stops[0]];
  if (stops.length === 2) return [stops[0], stops[1], stops[0], stops[1]];
  if (stops.length === 3) return [stops[0], stops[1], stops[2], stops[1]];
  // Map palette clockwise (TL -> TR -> BR -> BL) into [TL, TR, BL, BR].
  return [stops[0], stops[1], stops[3], stops[2]];
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

function buildEdgeGradient(corners: [string, string, string, string]) {
  return `conic-gradient(from -90deg, ${withAlpha(corners[0], 0.98)} 0deg, ${withAlpha(corners[1], 0.98)} 90deg, ${withAlpha(corners[3], 0.98)} 180deg, ${withAlpha(corners[2], 0.98)} 270deg, ${withAlpha(corners[0], 0.98)} 360deg)`;
}

function buildAuraGradient(corners: [string, string, string, string]) {
  return [
    `conic-gradient(from -90deg at 50% 50%, ${withAlpha(corners[0], 0.16)} 0deg, ${withAlpha(corners[1], 0.16)} 90deg, ${withAlpha(corners[3], 0.16)} 180deg, ${withAlpha(corners[2], 0.16)} 270deg, ${withAlpha(corners[0], 0.16)} 360deg)`,
    `radial-gradient(94% 94% at 0% 0%, ${withAlpha(corners[0], 0.2)} 0%, ${withAlpha(corners[0], 0.08)} 36%, ${withAlpha(corners[0], 0)} 72%)`,
    `radial-gradient(94% 94% at 100% 0%, ${withAlpha(corners[1], 0.2)} 0%, ${withAlpha(corners[1], 0.08)} 36%, ${withAlpha(corners[1], 0)} 72%)`,
    `radial-gradient(94% 94% at 0% 100%, ${withAlpha(corners[2], 0.2)} 0%, ${withAlpha(corners[2], 0.08)} 36%, ${withAlpha(corners[2], 0)} 72%)`,
    `radial-gradient(94% 94% at 100% 100%, ${withAlpha(corners[3], 0.2)} 0%, ${withAlpha(corners[3], 0.08)} 36%, ${withAlpha(corners[3], 0)} 72%)`,
    'radial-gradient(56% 56% at 50% 50%, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 72%)',
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

const CORNER_TO_EDGE_INDEXES: ReadonlyArray<readonly [number, number]> = [
  [0, 3], // top + left
  [0, 1], // top + right
  [2, 3], // bottom + left
  [2, 1], // bottom + right
];

const CORNER_ALPHA_VARS = [
  '--corner-tl-alpha',
  '--corner-tr-alpha',
  '--corner-bl-alpha',
  '--corner-br-alpha',
] as const;

const EDGE_ALPHA_VARS = [
  '--edge-top-alpha',
  '--edge-right-alpha',
  '--edge-bottom-alpha',
  '--edge-left-alpha',
] as const;

function applyCardLighting(card: HTMLElement, clientX: number, clientY: number) {
  const rect = card.getBoundingClientRect();
  const rawX = (clientX - rect.left) / rect.width;
  const rawY = (clientY - rect.top) / rect.height;
  const x = clamp(rawX);
  const y = clamp(rawY);

  const cornerDistances = [
    Math.hypot(x, y),
    Math.hypot(1 - x, y),
    Math.hypot(x, 1 - y),
    Math.hypot(1 - x, 1 - y),
  ] as const;
  let activeCorner = 0;
  for (let index = 1; index < cornerDistances.length; index += 1) {
    if (cornerDistances[index] < cornerDistances[activeCorner]) {
      activeCorner = index;
    }
  }

  const cornerDistance = cornerDistances[activeCorner];
  const cornerProximity = clamp(1 - cornerDistance / 0.58);

  const edgeDistance = Math.min(x, 1 - x, y, 1 - y);
  const edgeProximity = clamp(1 - edgeDistance / 0.24);

  const centerDistance = Math.hypot(x - 0.5, y - 0.5) / 0.70710678118;
  const centerProximity = clamp(1 - centerDistance * 1.08);

  const hotCornerAlpha = clamp(0.36 + cornerProximity * 0.9 + edgeProximity * 0.1, 0, 1);
  const idleCornerAlpha = clamp(cornerProximity * 0.008, 0, 0.012);
  const cornerAlphas = [idleCornerAlpha, idleCornerAlpha, idleCornerAlpha, idleCornerAlpha];
  cornerAlphas[activeCorner] = hotCornerAlpha;

  const dimEdgeAlpha = clamp(0.01 + edgeProximity * 0.05, 0, 0.08);
  const hotEdgeAlpha = clamp(0.42 + cornerProximity * 0.82 + edgeProximity * 0.16, 0, 1);
  const edgeAlphas = [dimEdgeAlpha * 0.22, dimEdgeAlpha * 0.22, dimEdgeAlpha * 0.22, dimEdgeAlpha * 0.22];
  const [edgeA, edgeB] = CORNER_TO_EDGE_INDEXES[activeCorner];
  edgeAlphas[edgeA] = hotEdgeAlpha;
  edgeAlphas[edgeB] = hotEdgeAlpha;

  const auraAlpha = clamp(0.02 + cornerProximity * 0.25 + edgeProximity * 0.1 - centerProximity * 0.04, 0, 0.34);
  const coreAlpha = clamp(0.22 + centerProximity * 0.56 + cornerProximity * 0.18, 0, 1);
  const edgeBright = clamp(0.52 + hotEdgeAlpha * 1.04, 0, 1.55);
  const edgeBloom = 1.6 + cornerProximity * 3.3;
  const edgeBeamAlpha = clamp(0.34 + hotEdgeAlpha * 0.9, 0, 1);
  const cornerBloom = 3 + cornerProximity * 5.8;
  const cornerBlur = 0.01 + cornerProximity * 0.04;

  card.style.setProperty('--pointer-x', (x - 0.5).toFixed(3));
  card.style.setProperty('--pointer-y', (y - 0.5).toFixed(3));
  card.style.setProperty('--beam-x', (x * 100).toFixed(2));
  card.style.setProperty('--beam-y', (y * 100).toFixed(2));
  CORNER_ALPHA_VARS.forEach((name, index) => {
    card.style.setProperty(name, cornerAlphas[index].toFixed(3));
  });
  EDGE_ALPHA_VARS.forEach((name, index) => {
    card.style.setProperty(name, edgeAlphas[index].toFixed(3));
  });
  card.style.setProperty('--aura-alpha', auraAlpha.toFixed(3));
  card.style.setProperty('--core-alpha', coreAlpha.toFixed(3));
  card.style.setProperty('--edge-bright', edgeBright.toFixed(3));
  card.style.setProperty('--edge-beam-alpha', edgeBeamAlpha.toFixed(3));
  card.style.setProperty('--edge-bloom', `${edgeBloom.toFixed(2)}px`);
  card.style.setProperty('--corner-bloom', `${cornerBloom.toFixed(2)}px`);
  card.style.setProperty('--corner-blur', `${cornerBlur.toFixed(2)}px`);
}

function resetCardLighting(card: HTMLElement) {
  card.style.setProperty('--pointer-x', '0');
  card.style.setProperty('--pointer-y', '0');
  card.style.setProperty('--beam-x', '50');
  card.style.setProperty('--beam-y', '50');
  CORNER_ALPHA_VARS.forEach((name) => {
    card.style.setProperty(name, '0');
  });
  EDGE_ALPHA_VARS.forEach((name) => {
    card.style.setProperty(name, '0');
  });
  card.style.setProperty('--aura-alpha', '0');
  card.style.setProperty('--core-alpha', '0');
  card.style.setProperty('--edge-bright', '0');
  card.style.setProperty('--edge-beam-alpha', '0');
  card.style.setProperty('--edge-bloom', '0px');
  card.style.setProperty('--corner-bloom', '0px');
  card.style.setProperty('--corner-blur', '0px');
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
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const pointerFrameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

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
            edgeGradient: buildEdgeGradient(cornerColors),
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

  const applySharedLighting = useCallback((clientX: number, clientY: number) => {
    for (const card of cardRefs.current.values()) {
      const rect = card.getBoundingClientRect();
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const distance = Math.hypot(dx, dy);

      // Keep neighboring cards reactive so the conduit glow also responds in gutter space.
      if (distance <= 34) {
        applyCardLighting(card, clientX, clientY);
      } else {
        resetCardLighting(card);
      }
    }
  }, []);

  const flushSharedLighting = useCallback(() => {
    pointerFrameRef.current = null;
    const pointer = pointerRef.current;
    if (!pointer) return;
    applySharedLighting(pointer.x, pointer.y);
  }, [applySharedLighting]);

  const queueSharedLighting = useCallback((clientX: number, clientY: number) => {
    pointerRef.current = { x: clientX, y: clientY };
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = window.requestAnimationFrame(flushSharedLighting);
  }, [flushSharedLighting]);

  const clearSharedLighting = useCallback(() => {
    pointerRef.current = null;
    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
    for (const card of cardRefs.current.values()) {
      resetCardLighting(card);
    }
  }, []);

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    },
    [],
  );

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
        <defs><filter id="toolkit-blur"><feGaussianBlur stdDeviation="12" /></filter></defs>
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
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              onPointerMove={(event) => queueSharedLighting(event.clientX, event.clientY)}
              onPointerLeave={clearSharedLighting}
            >
              {visibleToolkits.map((toolkit) => {
                const isConnecting = pendingConnectKey === toolkit.key;
                const [topLeftColor, topRightColor, bottomLeftColor, bottomRightColor] = toolkit.cornerColors;
                const primaryColor = topLeftColor;
                const topEdgeColor = mixHex(topLeftColor, topRightColor, 0.5);
                const rightEdgeColor = mixHex(topRightColor, bottomRightColor, 0.5);
                const bottomEdgeColor = mixHex(bottomLeftColor, bottomRightColor, 0.5);
                const leftEdgeColor = mixHex(topLeftColor, bottomLeftColor, 0.5);
                return (
                  <article
                    key={toolkit.key}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(toolkit.key, node);
                      } else {
                        cardRefs.current.delete(toolkit.key);
                      }
                    }}
                    className="toolkit-card group relative cursor-pointer rounded-xl border border-white/[0.12] bg-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,transform] duration-200 ease-out hover:border-white/[0.2] active:translate-y-px active:scale-[0.99]"
                    style={{
                      containerType: 'size',
                      aspectRatio: '1 / 1',
                      '--pointer-x': '0',
                      '--pointer-y': '0',
                      '--beam-x': '50',
                      '--beam-y': '50',
                      '--corner-tl-alpha': '0',
                      '--corner-tr-alpha': '0',
                      '--corner-bl-alpha': '0',
                      '--corner-br-alpha': '0',
                      '--edge-top-alpha': '0',
                      '--edge-right-alpha': '0',
                      '--edge-bottom-alpha': '0',
                      '--edge-left-alpha': '0',
                      '--aura-alpha': '0',
                      '--core-alpha': '0',
                      '--edge-bright': '0',
                      '--edge-beam-alpha': '0',
                      '--edge-bloom': '0px',
                      '--corner-bloom': '0px',
                      '--corner-blur': '0px',
                    } as CSSProperties}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl [clip-path:inset(0_round_12px)]">
                      <div className="absolute inset-0 bg-[#1a1a1a]" />

                      <div
                        className="pointer-events-none absolute inset-[1px] z-[1] rounded-[11px] transition-[opacity,filter] duration-300 ease-out"
                        style={{
                          background: toolkit.auraGradient,
                          opacity: 'calc(0.01 + var(--aura-alpha, 0) * 0.42)',
                          filter: 'saturate(1.24) brightness(1.06)',
                          mixBlendMode: 'screen',
                        }}
                      />

                      <div
                        className="pointer-events-none absolute inset-[1px] z-[1] rounded-[11px] transition-[opacity,filter,transform] duration-300"
                        style={{
                          background: `radial-gradient(66% 66% at 50% 50%, ${withAlpha(primaryColor, 0.86)} 0%, ${withAlpha(primaryColor, 0.34)} 34%, ${withAlpha(primaryColor, 0.12)} 56%, ${withAlpha(primaryColor, 0)} 78%)`,
                          opacity: 'calc(var(--core-alpha, 0) * 0.18)',
                          filter: 'saturate(1.85) brightness(1.18)',
                          mixBlendMode: 'screen',
                          transform: 'scale(calc(1 + var(--core-alpha, 0) * 0.035))',
                          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />

                      <div
                        className="pointer-events-none absolute inset-0 z-[1] grid place-items-center will-change-transform"
                        style={{
                          filter: "url('#toolkit-blur') saturate(3.7) brightness(1.18)",
                          translate: 'calc(var(--pointer-x, 0) * 26cqi) calc(var(--pointer-y, 0) * 26cqh)',
                          scale: '2.35',
                          opacity: 'calc(0.012 + var(--aura-alpha, 0) * 0.15)',
                          transition: 'opacity 300ms ease-out, translate 160ms ease-out',
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
                    >
                      <div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: toolkit.edgeGradient,
                          opacity: 'calc(var(--edge-beam-alpha, 0) * 0.58)',
                          padding: '1px',
                          mixBlendMode: 'screen',
                          filter: 'saturate(calc(1.35 + var(--edge-bright, 0) * 1.18)) brightness(calc(1.08 + var(--edge-bright, 0) * 0.82))',
                          animation: 'toolkitOrbit 1350ms linear infinite',
                          transition: 'opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), filter 200ms cubic-bezier(0.16, 1, 0.3, 1)',
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
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'conic-gradient(from -90deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.94) 22deg, rgba(255,255,255,0.05) 48deg, rgba(255,255,255,0) 78deg, rgba(255,255,255,0) 360deg)',
                          opacity: 'calc(var(--edge-beam-alpha, 0) * 0.64)',
                          padding: '1px',
                          mixBlendMode: 'screen',
                          filter: 'brightness(calc(1.1 + var(--edge-bright, 0) * 0.9)) drop-shadow(0 0 2.4px rgba(255,255,255,0.34))',
                          animation: 'toolkitOrbit 980ms linear infinite',
                          transition: 'opacity 130ms cubic-bezier(0.16, 1, 0.3, 1), filter 180ms cubic-bezier(0.16, 1, 0.3, 1)',
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
                        className="absolute left-[1px] right-[1px] top-[1px] h-px"
                        style={{
                          opacity: 'calc(var(--edge-top-alpha, 0) * (0.88 + var(--edge-beam-alpha, 0) * 0.68))',
                          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.98) 52%, rgba(255,255,255,0.72) 100%), linear-gradient(90deg, ${withAlpha(topLeftColor, 0.86)} 0%, ${withAlpha(topRightColor, 0.86)} 100%), radial-gradient(42% 360% at calc(var(--beam-x, 50) * 1%) 50%, ${withAlpha(topLeftColor, 1)} 0%, ${withAlpha(topRightColor, 1)} 34%, ${withAlpha(topRightColor, 0)} 74%)`,
                          backgroundRepeat: 'no-repeat',
                          mixBlendMode: 'screen',
                          filter: `contrast(calc(1.06 + var(--edge-bright, 0) * 0.26)) saturate(calc(1.8 + var(--edge-bright, 0) * 1.45)) brightness(calc(1.2 + var(--edge-bright, 0) * 1.02)) drop-shadow(0 0 1.1px rgba(255,255,255,0.56)) drop-shadow(0 0 calc(var(--edge-bloom, 0px) * 0.56) ${withAlpha(topEdgeColor, 0.86)})`,
                          transition: 'opacity 120ms cubic-bezier(0.16, 1, 0.3, 1), filter 170ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                      <div
                        className="absolute bottom-[1px] left-[1px] right-[1px] h-px"
                        style={{
                          opacity: 'calc(var(--edge-bottom-alpha, 0) * (0.88 + var(--edge-beam-alpha, 0) * 0.68))',
                          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.98) 52%, rgba(255,255,255,0.72) 100%), linear-gradient(90deg, ${withAlpha(bottomLeftColor, 0.86)} 0%, ${withAlpha(bottomRightColor, 0.86)} 100%), radial-gradient(42% 360% at calc(var(--beam-x, 50) * 1%) 50%, ${withAlpha(bottomLeftColor, 1)} 0%, ${withAlpha(bottomRightColor, 1)} 34%, ${withAlpha(bottomRightColor, 0)} 74%)`,
                          backgroundRepeat: 'no-repeat',
                          mixBlendMode: 'screen',
                          filter: `contrast(calc(1.06 + var(--edge-bright, 0) * 0.26)) saturate(calc(1.8 + var(--edge-bright, 0) * 1.45)) brightness(calc(1.2 + var(--edge-bright, 0) * 1.02)) drop-shadow(0 0 1.1px rgba(255,255,255,0.56)) drop-shadow(0 0 calc(var(--edge-bloom, 0px) * 0.56) ${withAlpha(bottomEdgeColor, 0.86)})`,
                          transition: 'opacity 120ms cubic-bezier(0.16, 1, 0.3, 1), filter 170ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                      <div
                        className="absolute bottom-[1px] left-[1px] top-[1px] w-px"
                        style={{
                          opacity: 'calc(var(--edge-left-alpha, 0) * (0.88 + var(--edge-beam-alpha, 0) * 0.68))',
                          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.98) 52%, rgba(255,255,255,0.72) 100%), linear-gradient(180deg, ${withAlpha(topLeftColor, 0.86)} 0%, ${withAlpha(bottomLeftColor, 0.86)} 100%), radial-gradient(360% 42% at 50% calc(var(--beam-y, 50) * 1%), ${withAlpha(topLeftColor, 1)} 0%, ${withAlpha(bottomLeftColor, 1)} 34%, ${withAlpha(bottomLeftColor, 0)} 74%)`,
                          backgroundRepeat: 'no-repeat',
                          mixBlendMode: 'screen',
                          filter: `contrast(calc(1.06 + var(--edge-bright, 0) * 0.26)) saturate(calc(1.8 + var(--edge-bright, 0) * 1.45)) brightness(calc(1.2 + var(--edge-bright, 0) * 1.02)) drop-shadow(0 0 1.1px rgba(255,255,255,0.56)) drop-shadow(0 0 calc(var(--edge-bloom, 0px) * 0.56) ${withAlpha(leftEdgeColor, 0.86)})`,
                          transition: 'opacity 120ms cubic-bezier(0.16, 1, 0.3, 1), filter 170ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                      <div
                        className="absolute bottom-[1px] right-[1px] top-[1px] w-px"
                        style={{
                          opacity: 'calc(var(--edge-right-alpha, 0) * (0.88 + var(--edge-beam-alpha, 0) * 0.68))',
                          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.98) 52%, rgba(255,255,255,0.72) 100%), linear-gradient(180deg, ${withAlpha(topRightColor, 0.86)} 0%, ${withAlpha(bottomRightColor, 0.86)} 100%), radial-gradient(360% 42% at 50% calc(var(--beam-y, 50) * 1%), ${withAlpha(topRightColor, 1)} 0%, ${withAlpha(bottomRightColor, 1)} 34%, ${withAlpha(bottomRightColor, 0)} 74%)`,
                          backgroundRepeat: 'no-repeat',
                          mixBlendMode: 'screen',
                          filter: `contrast(calc(1.06 + var(--edge-bright, 0) * 0.26)) saturate(calc(1.8 + var(--edge-bright, 0) * 1.45)) brightness(calc(1.2 + var(--edge-bright, 0) * 1.02)) drop-shadow(0 0 1.1px rgba(255,255,255,0.56)) drop-shadow(0 0 calc(var(--edge-bloom, 0px) * 0.56) ${withAlpha(rightEdgeColor, 0.86)})`,
                          transition: 'opacity 120ms cubic-bezier(0.16, 1, 0.3, 1), filter 170ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>

                    <div className="pointer-events-none absolute inset-0 z-[4] rounded-xl">
                      <div
                        className="absolute left-0 top-0 h-[15%] w-[15%]"
                        style={{
                          backgroundImage: `linear-gradient(90deg, ${withAlpha(topLeftColor, 0.98)} 0%, ${withAlpha(topLeftColor, 0.98)} 42%, ${withAlpha(topLeftColor, 0)} 100%), linear-gradient(180deg, ${withAlpha(topLeftColor, 0.98)} 0%, ${withAlpha(topLeftColor, 0.98)} 42%, ${withAlpha(topLeftColor, 0)} 100%)`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '100% 1px, 1px 100%',
                          backgroundPosition: 'top left, top left',
                          opacity: 'var(--corner-tl-alpha, 0)',
                          filter: `blur(var(--corner-blur, 0px)) brightness(1.28) drop-shadow(0 0 calc(var(--corner-bloom, 0px) * 0.62) ${withAlpha(topLeftColor, 0.94)}) drop-shadow(0 0 var(--corner-bloom, 0px) ${withAlpha(topLeftColor, 0.66)})`,
                          transition: 'opacity 90ms cubic-bezier(0.2, 0.85, 0.2, 1), filter 120ms cubic-bezier(0.2, 0.85, 0.2, 1)',
                        }}
                      />
                      <div
                        className="absolute right-0 top-0 h-[15%] w-[15%]"
                        style={{
                          backgroundImage: `linear-gradient(270deg, ${withAlpha(topRightColor, 0.98)} 0%, ${withAlpha(topRightColor, 0.98)} 42%, ${withAlpha(topRightColor, 0)} 100%), linear-gradient(180deg, ${withAlpha(topRightColor, 0.98)} 0%, ${withAlpha(topRightColor, 0.98)} 42%, ${withAlpha(topRightColor, 0)} 100%)`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '100% 1px, 1px 100%',
                          backgroundPosition: 'top right, top right',
                          opacity: 'var(--corner-tr-alpha, 0)',
                          filter: `blur(var(--corner-blur, 0px)) brightness(1.28) drop-shadow(0 0 calc(var(--corner-bloom, 0px) * 0.62) ${withAlpha(topRightColor, 0.94)}) drop-shadow(0 0 var(--corner-bloom, 0px) ${withAlpha(topRightColor, 0.66)})`,
                          transition: 'opacity 90ms cubic-bezier(0.2, 0.85, 0.2, 1), filter 120ms cubic-bezier(0.2, 0.85, 0.2, 1)',
                        }}
                      />
                      <div
                        className="absolute bottom-0 left-0 h-[15%] w-[15%]"
                        style={{
                          backgroundImage: `linear-gradient(90deg, ${withAlpha(bottomLeftColor, 0.98)} 0%, ${withAlpha(bottomLeftColor, 0.98)} 42%, ${withAlpha(bottomLeftColor, 0)} 100%), linear-gradient(0deg, ${withAlpha(bottomLeftColor, 0.98)} 0%, ${withAlpha(bottomLeftColor, 0.98)} 42%, ${withAlpha(bottomLeftColor, 0)} 100%)`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '100% 1px, 1px 100%',
                          backgroundPosition: 'bottom left, bottom left',
                          opacity: 'var(--corner-bl-alpha, 0)',
                          filter: `blur(var(--corner-blur, 0px)) brightness(1.28) drop-shadow(0 0 calc(var(--corner-bloom, 0px) * 0.62) ${withAlpha(bottomLeftColor, 0.94)}) drop-shadow(0 0 var(--corner-bloom, 0px) ${withAlpha(bottomLeftColor, 0.66)})`,
                          transition: 'opacity 90ms cubic-bezier(0.2, 0.85, 0.2, 1), filter 120ms cubic-bezier(0.2, 0.85, 0.2, 1)',
                        }}
                      />
                      <div
                        className="absolute bottom-0 right-0 h-[15%] w-[15%]"
                        style={{
                          backgroundImage: `linear-gradient(270deg, ${withAlpha(bottomRightColor, 0.98)} 0%, ${withAlpha(bottomRightColor, 0.98)} 42%, ${withAlpha(bottomRightColor, 0)} 100%), linear-gradient(0deg, ${withAlpha(bottomRightColor, 0.98)} 0%, ${withAlpha(bottomRightColor, 0.98)} 42%, ${withAlpha(bottomRightColor, 0)} 100%)`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '100% 1px, 1px 100%',
                          backgroundPosition: 'bottom right, bottom right',
                          opacity: 'var(--corner-br-alpha, 0)',
                          filter: `blur(var(--corner-blur, 0px)) brightness(1.28) drop-shadow(0 0 calc(var(--corner-bloom, 0px) * 0.62) ${withAlpha(bottomRightColor, 0.94)}) drop-shadow(0 0 var(--corner-bloom, 0px) ${withAlpha(bottomRightColor, 0.66)})`,
                          transition: 'opacity 90ms cubic-bezier(0.2, 0.85, 0.2, 1), filter 120ms cubic-bezier(0.2, 0.85, 0.2, 1)',
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
      <style jsx global>{`
        @keyframes toolkitOrbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
