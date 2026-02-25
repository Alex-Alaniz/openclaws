'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'All' | 'Connected';
type Status = 'connect' | 'connected' | 'active';

type ToolkitSeed = {
  name: string;
  slug: string;
  brandColor?: string;
  status?: Status;
};

type Toolkit = {
  key: string;
  name: string;
  slug: string;
  status: Status;
  brandColor: string;
  borderGradient: string;
};

const INITIAL_BATCH_SIZE = 24;
const LOAD_BATCH_SIZE = 12;

const COLOR_POOL = [
  '#EA4335', '#4285F4', '#34A853', '#FBBC05', '#635BFF', '#F24E1E', '#5E6AD2', '#5865F2', '#3ECF8E', '#0EA5E9', '#14B8A6', '#E11D48', '#F97316', '#8B5CF6', '#0F172A', '#F59E0B', '#22C55E', '#06B6D4', '#2563EB', '#DC2626', '#A855F7', '#84CC16', '#F43F5E', '#10B981',
];

const ACTIVE_BY_DEFAULT = new Set(['Composio', 'Code Interpreter', 'Zapier', 'n8n', 'GitHub Actions', 'PagerDuty', 'Google Cloud', 'OpenAI', 'Anthropic']);

const CONNECTED_BY_DEFAULT = new Set([
  'Slack', 'GitHub', 'Notion', 'Google Calendar', 'Google Drive', 'Linear', 'Figma', 'Stripe', 'Supabase', 'Discord', 'Outlook', 'Airtable', 'HubSpot', 'Salesforce', 'Datadog', 'Sentry', 'Vercel', 'Render', 'Shopify', 'Twilio', 'MongoDB', 'Redis', 'Snowflake', 'BigQuery', 'Zendesk', 'Intercom',
]);

const TOOLKIT_SEEDS: ToolkitSeed[] = [
  { name: 'Gmail', slug: 'gmail', brandColor: '#EA4335' },
  { name: 'Composio', slug: 'composio', brandColor: '#4F46E5', status: 'active' },
  { name: 'GitHub', slug: 'github', brandColor: '#6E7681', status: 'connected' },
  { name: 'Google Calendar', slug: 'googlecalendar', brandColor: '#4285F4', status: 'connected' },
  { name: 'Notion', slug: 'notion', brandColor: '#FFFFFF', status: 'connected' },
  { name: 'Google Sheets', slug: 'googlesheets', brandColor: '#0F9D58' },
  { name: 'Slack', slug: 'slack', brandColor: '#E01E5A', status: 'connected' },
  { name: 'Supabase', slug: 'supabase', brandColor: '#3ECF8E', status: 'connected' },
  { name: 'Outlook', slug: 'outlook', brandColor: '#0078D4', status: 'connected' },
  { name: 'Perplexity', slug: 'perplexityai', brandColor: '#20B2AA' },
  { name: 'Twitter/X', slug: 'twitter', brandColor: '#111111' },
  { name: 'Google Drive', slug: 'googledrive', brandColor: '#4285F4', status: 'connected' },
  { name: 'Google Docs', slug: 'googledocs', brandColor: '#4285F4' },
  { name: 'HubSpot', slug: 'hubspot', brandColor: '#FF7A59', status: 'connected' },
  { name: 'Linear', slug: 'linear', brandColor: '#5E6AD2', status: 'connected' },
  { name: 'Airtable', slug: 'airtable', brandColor: '#FCBF49', status: 'connected' },
  { name: 'Code Interpreter', slug: 'codeinterpreter', brandColor: '#6B7280', status: 'active' },
  { name: 'SerpApi', slug: 'serpapi', brandColor: '#6366F1' },
  { name: 'Jira', slug: 'jira', brandColor: '#0052CC' },
  { name: 'Firecrawl', slug: 'firecrawl', brandColor: '#F97316' },
  { name: 'Todoist', slug: 'todoist', brandColor: '#E44332' },
  { name: 'Trello', slug: 'trello', brandColor: '#0079BF' },
  { name: 'Stripe', slug: 'stripe', brandColor: '#635BFF', status: 'connected' },
  { name: 'Figma', slug: 'figma', brandColor: '#F24E1E', status: 'connected' },
  { name: 'Discord', slug: 'discord', brandColor: '#5865F2', status: 'connected' },
  { name: 'Asana', slug: 'asana', brandColor: '#F06A6A' },
  { name: 'Monday.com', slug: 'monday', brandColor: '#FF3D57' },
  { name: 'ClickUp', slug: 'clickup', brandColor: '#7B68EE' },
  { name: 'Zoom', slug: 'zoom', brandColor: '#2D8CFF' },
  { name: 'Dropbox', slug: 'dropbox', brandColor: '#0061FF' },
  { name: 'Box', slug: 'box', brandColor: '#0061D5' },
  { name: 'OneDrive', slug: 'onedrive', brandColor: '#0078D4' },
  { name: 'SharePoint', slug: 'sharepoint', brandColor: '#03787C' },
  { name: 'Microsoft Teams', slug: 'microsoftteams', brandColor: '#6264A7' },
  { name: 'Salesforce', slug: 'salesforce', brandColor: '#00A1E0', status: 'connected' },
  { name: 'Zendesk', slug: 'zendesk', brandColor: '#03363D', status: 'connected' },
  { name: 'Intercom', slug: 'intercom', brandColor: '#1F8DED', status: 'connected' },
  { name: 'Freshdesk', slug: 'freshdesk', brandColor: '#00A886' },
  { name: 'Pipedrive', slug: 'pipedrive', brandColor: '#137333' },
  { name: 'Calendly', slug: 'calendly', brandColor: '#006BFF' },
  { name: 'Typeform', slug: 'typeform', brandColor: '#262627' },
  { name: 'SurveyMonkey', slug: 'surveymonkey', brandColor: '#00BF6F' },
  { name: 'Webflow', slug: 'webflow', brandColor: '#4353FF' },
  { name: 'Shopify', slug: 'shopify', brandColor: '#95BF47', status: 'connected' },
  { name: 'WooCommerce', slug: 'woocommerce', brandColor: '#96588A' },
  { name: 'Squarespace', slug: 'squarespace', brandColor: '#111111' },
  { name: 'Wix', slug: 'wix', brandColor: '#0C6EFC' },
  { name: 'BigCommerce', slug: 'bigcommerce', brandColor: '#121118' },
  { name: 'Mailchimp', slug: 'mailchimp', brandColor: '#FFE01B' },
  { name: 'Klaviyo', slug: 'klaviyo', brandColor: '#1A1A1A' },
  { name: 'SendGrid', slug: 'sendgrid', brandColor: '#1A82E2' },
  { name: 'Postmark', slug: 'postmark', brandColor: '#FFDE00' },
  { name: 'Twilio', slug: 'twilio', brandColor: '#F22F46', status: 'connected' },
  { name: 'Vonage', slug: 'vonage', brandColor: '#FF6622' },
  { name: 'MessageBird', slug: 'messagebird', brandColor: '#2482FF' },
  { name: 'WhatsApp Business', slug: 'whatsapp', brandColor: '#25D366' },
  { name: 'Telegram', slug: 'telegram', brandColor: '#2AABEE' },
  { name: 'Signal', slug: 'signal', brandColor: '#3A76F0' },
  { name: 'Messenger', slug: 'messenger', brandColor: '#0A7CFF' },
  { name: 'YouTube', slug: 'youtube', brandColor: '#FF0000' },
  { name: 'Vimeo', slug: 'vimeo', brandColor: '#1AB7EA' },
  { name: 'TikTok', slug: 'tiktok', brandColor: '#000000' },
  { name: 'Instagram', slug: 'instagram', brandColor: '#E1306C' },
  { name: 'Facebook Pages', slug: 'facebook', brandColor: '#1877F2' },
  { name: 'LinkedIn', slug: 'linkedin', brandColor: '#0A66C2' },
  { name: 'Reddit', slug: 'reddit', brandColor: '#FF4500' },
  { name: 'Medium', slug: 'medium', brandColor: '#111111' },
  { name: 'Ghost', slug: 'ghost', brandColor: '#15171A' },
  { name: 'Contentful', slug: 'contentful', brandColor: '#2478CC' },
  { name: 'Sanity', slug: 'sanity', brandColor: '#F03E2F' },
  { name: 'Strapi', slug: 'strapi', brandColor: '#4945FF' },
  { name: 'WordPress', slug: 'wordpress', brandColor: '#21759B' },
  { name: 'Drupal', slug: 'drupal', brandColor: '#0678BE' },
  { name: 'Confluence', slug: 'confluence', brandColor: '#172B4D' },
  { name: 'Coda', slug: 'coda', brandColor: '#F46A54' },
  { name: 'Obsidian', slug: 'obsidian', brandColor: '#7C3AED' },
  { name: 'Miro', slug: 'miro', brandColor: '#FFD02F' },
  { name: 'Lucidchart', slug: 'lucidchart', brandColor: '#F58220' },
  { name: 'Canva', slug: 'canva', brandColor: '#00C4CC' },
  { name: 'Framer', slug: 'framer', brandColor: '#0055FF' },
  { name: 'Adobe XD', slug: 'adobexd', brandColor: '#FF61F6' },
  { name: 'Behance', slug: 'behance', brandColor: '#1769FF' },
  { name: 'Dribbble', slug: 'dribbble', brandColor: '#EA4C89' },
  { name: 'Cloudflare', slug: 'cloudflare', brandColor: '#F38020' },
  { name: 'Vercel', slug: 'vercel', brandColor: '#000000', status: 'connected' },
  { name: 'Netlify', slug: 'netlify', brandColor: '#00AD9F' },
  { name: 'Render', slug: 'render', brandColor: '#46E3B7', status: 'connected' },
  { name: 'Railway', slug: 'railway', brandColor: '#0B0D0E' },
  { name: 'Fly.io', slug: 'flyio', brandColor: '#7B3FE4' },
  { name: 'Amazon Web Services', slug: 'aws', brandColor: '#FF9900' },
  { name: 'Google Cloud', slug: 'googlecloud', brandColor: '#4285F4', status: 'active' },
  { name: 'Microsoft Azure', slug: 'azure', brandColor: '#0078D4' },
  { name: 'DigitalOcean', slug: 'digitalocean', brandColor: '#0080FF' },
  { name: 'Heroku', slug: 'heroku', brandColor: '#6762A6' },
  { name: 'Kubernetes', slug: 'kubernetes', brandColor: '#326CE5' },
  { name: 'Docker Hub', slug: 'docker', brandColor: '#2496ED' },
  { name: 'GitLab', slug: 'gitlab', brandColor: '#FC6D26' },
  { name: 'Bitbucket', slug: 'bitbucket', brandColor: '#0052CC' },
  { name: 'CircleCI', slug: 'circleci', brandColor: '#343434' },
  { name: 'GitHub Actions', slug: 'githubactions', brandColor: '#2088FF', status: 'active' },
  { name: 'Jenkins', slug: 'jenkins', brandColor: '#D24939' },
  { name: 'Travis CI', slug: 'travisci', brandColor: '#3EAAAF' },
  { name: 'Sentry', slug: 'sentry', brandColor: '#5A3E85', status: 'connected' },
  { name: 'Datadog', slug: 'datadog', brandColor: '#632CA6', status: 'connected' },
  { name: 'New Relic', slug: 'newrelic', brandColor: '#1CE783' },
  { name: 'Grafana', slug: 'grafana', brandColor: '#F46800' },
  { name: 'Prometheus', slug: 'prometheus', brandColor: '#E6522C' },
  { name: 'PagerDuty', slug: 'pagerduty', brandColor: '#06AC38', status: 'active' },
  { name: 'Opsgenie', slug: 'opsgenie', brandColor: '#2684FF' },
  { name: 'Splunk', slug: 'splunk', brandColor: '#65A637' },
  { name: 'Snowflake', slug: 'snowflake', brandColor: '#29B5E8', status: 'connected' },
  { name: 'BigQuery', slug: 'bigquery', brandColor: '#669DF6', status: 'connected' },
  { name: 'Redshift', slug: 'redshift', brandColor: '#8C4FFF' },
  { name: 'PostgreSQL', slug: 'postgres', brandColor: '#336791' },
  { name: 'MySQL', slug: 'mysql', brandColor: '#4479A1' },
  { name: 'MongoDB', slug: 'mongodb', brandColor: '#47A248', status: 'connected' },
  { name: 'Redis', slug: 'redis', brandColor: '#DC382D', status: 'connected' },
  { name: 'Elasticsearch', slug: 'elasticsearch', brandColor: '#005571' },
  { name: 'Neo4j', slug: 'neo4j', brandColor: '#4581C3' },
  { name: 'Pinecone', slug: 'pinecone', brandColor: '#14B8A6' },
  { name: 'Weaviate', slug: 'weaviate', brandColor: '#00C2A8' },
  { name: 'Qdrant', slug: 'qdrant', brandColor: '#DC40A2' },
  { name: 'OpenAI', slug: 'openai', brandColor: '#111111', status: 'active' },
  { name: 'Anthropic', slug: 'anthropic', brandColor: '#D97706', status: 'active' },
  { name: 'Cohere', slug: 'cohere', brandColor: '#3955F6' },
  { name: 'Gemini', slug: 'gemini', brandColor: '#8E8E93' },
  { name: 'Hugging Face', slug: 'huggingface', brandColor: '#FFCC4D' },
  { name: 'Replicate', slug: 'replicate', brandColor: '#111111' },
  { name: 'Stability AI', slug: 'stabilityai', brandColor: '#4B5563' },
  { name: 'ElevenLabs', slug: 'elevenlabs', brandColor: '#111111' },
  { name: 'AssemblyAI', slug: 'assemblyai', brandColor: '#A855F7' },
  { name: 'Deepgram', slug: 'deepgram', brandColor: '#00E5A0' },
  { name: 'Zapier', slug: 'zapier', brandColor: '#FF4F00', status: 'active' },
  { name: 'Make', slug: 'make', brandColor: '#7B61FF' },
  { name: 'n8n', slug: 'n8n', brandColor: '#EA4B71', status: 'active' },
  { name: 'IFTTT', slug: 'ifttt', brandColor: '#000000' },
  { name: 'Segment', slug: 'segment', brandColor: '#52BD95' },
  { name: 'Mixpanel', slug: 'mixpanel', brandColor: '#7856FF' },
  { name: 'Amplitude', slug: 'amplitude', brandColor: '#4F46E5' },
  { name: 'Heap', slug: 'heap', brandColor: '#6D28D9' },
  { name: 'Hotjar', slug: 'hotjar', brandColor: '#FF3C00' },
  { name: 'FullStory', slug: 'fullstory', brandColor: '#1A1A1A' },
  { name: 'Gong', slug: 'gong', brandColor: '#FF5A5F' },
  { name: 'Apollo', slug: 'apollo', brandColor: '#6D4AFF' },
  { name: 'Clearbit', slug: 'clearbit', brandColor: '#4E7AF9' },
];

function getLogoUrl(slug: string) {
  return `https://logos.composio.dev/api/${slug}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return [parseInt(`${r}${r}`, 16), parseInt(`${g}${g}`, 16), parseInt(`${b}${b}`, 16)];
  }
  if (normalized.length === 6) {
    return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
  }
  return [255, 255, 255];
}

function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildBorderGradient(index: number, primary: string, secondary: string) {
  const mode = index % 4;
  if (mode === 0) return `linear-gradient(${165 + (index % 24)}deg, ${withAlpha(primary, 0.97)}, ${withAlpha(secondary, 0.78)})`;
  if (mode === 1) return `linear-gradient(${220 - (index % 34)}deg, ${withAlpha('#ffffff', 0.72)}, ${withAlpha(primary, 0.9)}, ${withAlpha(secondary, 0.68)})`;
  if (mode === 2) return `conic-gradient(from var(--border-angle, ${125 + (index % 30)}deg), ${withAlpha(primary, 0.96)}, ${withAlpha(secondary, 0.9)}, ${withAlpha(primary, 0.62)}, ${withAlpha(secondary, 0.94)}, ${withAlpha(primary, 0.96)})`;
  return `linear-gradient(${145 + (index % 20)}deg, ${withAlpha(primary, 0.94)}, ${withAlpha('#18181b', 0.84)}, ${withAlpha(secondary, 0.7)})`;
}

const ALL_TOOLKITS: Toolkit[] = TOOLKIT_SEEDS.map((seed, index) => {
  const primary = seed.brandColor ?? COLOR_POOL[index % COLOR_POOL.length];
  const secondary = COLOR_POOL[(index * 3 + 7) % COLOR_POOL.length];
  const status = seed.status ?? (ACTIVE_BY_DEFAULT.has(seed.name) ? 'active' : CONNECTED_BY_DEFAULT.has(seed.name) || index % 9 === 0 ? 'connected' : 'connect');
  return { key: `${seed.slug}-${index}`, name: seed.name, slug: seed.slug, status, brandColor: primary, borderGradient: buildBorderGradient(index, primary, secondary) };
});

export default function ToolkitsPage() {
  const [tab, setTab] = useState<Tab>('All');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [isGridHovering, setIsGridHovering] = useState(false);
  const [spotlightColor, setSpotlightColor] = useState('#38BDF8');
  const [toolkits, setToolkits] = useState<Toolkit[]>(ALL_TOOLKITS);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isAdvancingRef = useRef(false);

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
    isAdvancingRef.current = false;
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [query, tab]);

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

  const handleConnect = (key: string) => {
    setToolkits(prev => prev.map(t => t.key === key ? { ...t, status: 'connected' } : t));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070707] text-white">
      <style jsx global>{`
        .toolkit-card {
          background-color: #0c0c0c !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          transition: border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease !important;
        }
        .toolkit-card:hover {
          border-color: rgba(255, 255, 255, 0.15) !important;
          background-color: #0e0e0e !important;
        }
      `}</style>
      <svg className="hidden" aria-hidden="true">
        <defs><filter id="toolkit-blur"><feGaussianBlur stdDeviation="20" /></filter></defs>
      </svg>
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 xl:px-8">
        <div className="sticky top-0 z-20 rounded-[14px] border border-white/[0.08] bg-[#0A0A0A]/95 p-2 shadow-[0_16px_42px_rgba(0,0,0,0.44)] backdrop-blur-md">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search across ${toolkits.length}+ toolkits...`} className="h-[42px] w-full rounded-[10px] border border-white/[0.12] bg-[#161616] px-4 text-[13px] font-medium text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-white/30 xl:max-w-[640px]" />
            <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#161616] p-1">
              {(['All', 'Connected'] as const).map((item) => (
                <button key={item} onClick={() => setTab(item)} className={`h-7 rounded-[7px] px-4 text-[13px] font-bold tracking-tight transition-all ${tab === item ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/10'}`}>{item}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div 
          ref={gridRef} 
          className="relative" 
          style={{ ['--grid-x' as string]: '50%', ['--grid-y' as string]: '50%' }}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            gridRef.current?.style.setProperty('--grid-x', `${x.toFixed(2)}%`);
            gridRef.current?.style.setProperty('--grid-y', `${y.toFixed(2)}%`);
          }}
          onMouseEnter={() => setIsGridHovering(true)}
          onMouseLeave={() => {
            setIsGridHovering(false);
            setSpotlightColor('#38BDF8');
          }}
        >
          <div 
            className={`pointer-events-none absolute -inset-[300px] z-[0] hidden transition-opacity duration-500 md:block ${isGridHovering ? 'opacity-100' : 'opacity-0'}`} 
            style={{ 
              background: `radial-gradient(600px circle at var(--grid-x) var(--grid-y), ${withAlpha(spotlightColor, 0.1)} 0%, ${withAlpha(spotlightColor, 0.03)} 40%, transparent 80%)`,
              filter: 'blur(60px)' 
            }} 
          />
          
          <div className="relative z-[1] grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {visibleToolkits.map((toolkit) => {
              const logoUrl = getLogoUrl(toolkit.slug);
              return (
                <article key={toolkit.key} className="toolkit-card group relative aspect-square min-h-[240px] cursor-pointer rounded-[24px] outline outline-1 outline-white/[0.04] transition-all duration-300 ease-out hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] active:scale-[0.98] xl:min-h-[240px]" 
                  style={{ 
                    containerType: 'size', 
                    transform: 'perspective(1200px) rotateX(calc(var(--pointer-y, 0) * -2.5deg)) rotateY(calc(var(--pointer-x, 0) * 2.5deg))', 
                    ['--pointer-x' as string]: 0, 
                    ['--pointer-y' as string]: 0, 
                    ['--border-angle' as string]: '130deg'
                  }}
                  onMouseEnter={() => { setSpotlightColor(toolkit.brandColor); }}
                  onMouseMove={(e) => { 
                    const rect = e.currentTarget.getBoundingClientRect(); 
                    const x = (e.clientX - rect.left) / rect.width; 
                    const y = (e.clientY - rect.top) / rect.height; 
                    const centeredX = (x - 0.5) * 2; 
                    const centeredY = (y - 0.5) * 2; 
                    const angle = Math.atan2(centeredY, centeredX) * (180 / Math.PI) + 180; 
                    e.currentTarget.style.setProperty('--pointer-x', centeredX.toString()); 
                    e.currentTarget.style.setProperty('--pointer-y', centeredY.toString()); 
                    e.currentTarget.style.setProperty('--border-angle', `${angle.toFixed(2)}deg`); 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.setProperty('--pointer-x', '0'); 
                    e.currentTarget.style.setProperty('--pointer-y', '0'); 
                    e.currentTarget.style.setProperty('--border-angle', '130deg'); 
                  }}>
                  <div className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <div className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-[0.8]" style={{ background: `radial-gradient(85% 85% at calc(50% + (var(--pointer-x, 0) * 28%)) calc(50% + (var(--pointer-y, 0) * 26%)), ${withAlpha(toolkit.brandColor, 0.4)} 0%, ${withAlpha(toolkit.brandColor, 0.08)} 45%, transparent 85%)`, filter: 'blur(24px) saturate(1.4)' }} />
                    <div className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-300 group-hover:opacity-60" style={{ background: `radial-gradient(150% 130% at 50% 120%, ${withAlpha(toolkit.brandColor, 0.15)} 0%, transparent 60%)` }} />
                    <div className="pointer-events-none absolute inset-0 z-[3] grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-[0.4] will-change-transform" style={{ filter: "url('#toolkit-blur') saturate(6) brightness(1.4)", translate: 'calc(var(--pointer-x, -10) * 55cqi) calc(var(--pointer-y, -10) * 55cqh)', scale: '4' }}>
                      <img alt="" className="h-20 w-20" draggable={false} src={logoUrl} />
                    </div>
                    <div className="relative z-[4] flex h-full flex-col items-center justify-center gap-3 p-5 pt-10">
                      <div className="absolute right-4 top-4 z-[3]">
                        {toolkit.status === 'connect' ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleConnect(toolkit.key); }}
                            className="inline-flex h-8 items-center justify-center rounded-[10px] border border-white/90 bg-white px-3.5 text-[11px] font-bold tracking-tight text-black transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                          >
                            Connect
                          </button>
                        ) : (
                          <span className={`inline-flex h-8 items-center justify-center rounded-[10px] border border-white/10 px-3.5 text-[11px] font-bold tracking-tight text-white ${toolkit.status === 'active' ? 'bg-emerald-500/80' : 'bg-emerald-600/75'}`}>{toolkit.status === 'active' ? 'Active' : 'Connected'}</span>
                        )}
                      </div>
                      <img alt="App logo" className="h-14 w-14 select-none drop-shadow-2xl" draggable={false} src={logoUrl} />
                      <h3 className="select-none text-center text-[15px] font-semibold tracking-tight text-white/80">{toolkit.name}</h3>
                    </div>
                  </div>
                  <div className="border-glow pointer-events-none absolute inset-0 z-[5] rounded-[24px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ border: '2px solid transparent', background: toolkit.borderGradient, maskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)', maskOrigin: 'border-box, padding-box', maskClip: 'border-box, padding-box', maskComposite: 'exclude', WebkitMaskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)', WebkitMaskOrigin: 'border-box, padding-box', WebkitMaskClip: 'border-box, padding-box', WebkitMaskComposite: 'xor', filter: `drop-shadow(0 0 30px ${withAlpha(toolkit.brandColor, 0.7)})` }} />
                </article>
              );
            })}
          </div>
        </div>
        {filtered.length === 0 ? <div className="rounded-xl border border-white/10 bg-[#121212] px-5 py-8 text-center text-sm text-zinc-400">No toolkits match your search.</div> : null}
        {hasMore ? <div ref={sentinelRef} className="h-8 w-full" /> : null}
      </div>
    </div>
  );
}
