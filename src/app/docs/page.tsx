import Link from 'next/link';

export const metadata = {
  title: 'Documentation — OpenClaws',
  description: 'Complete guide to OpenClaws: setup, Control UI, channels, skills, cron jobs, and more.',
};

/* ── tiny helpers ─────────────────────────────────────────── */
function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold text-zinc-100" id={id}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-sm font-semibold text-zinc-200">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-zinc-400">{children}</p>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <div className="mt-1 text-xs text-zinc-500">{children}</div>
    </div>
  );
}
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-200 underline hover:text-white">{children}</a>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-zinc-800 px-1 text-xs text-zinc-300">{children}</code>;
}

/* ── page ─────────────────────────────────────────────────── */
export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      <header className="border-b border-white/[0.08] bg-[#0F0F0F]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/openclaw.svg" alt="OpenClaws" className="h-5 w-5" />
            <span className="text-sm font-bold text-zinc-100">OpenClaws</span>
            <span className="text-[10px] text-zinc-500">Docs</span>
          </Link>
          <Link href="/login" className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold hover:bg-red-700">
            Get Started
          </Link>
        </div>
      </header>

      {/* ── table of contents ── */}
      <nav className="border-b border-white/[0.06] bg-[#0A0A0A]">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">On this page</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {[
              ['overview', 'Overview'],
              ['quickstart', 'Quick Start'],
              ['control-ui', 'Control UI'],
              ['chat', 'Chat'],
              ['channels', 'Channels'],
              ['cron', 'Cron Jobs'],
              ['skills', 'Skills'],
              ['agents', 'Agents'],
              ['sessions', 'Sessions'],
              ['usage', 'Usage'],
              ['nodes', 'Nodes & Devices'],
              ['config', 'Configuration'],
              ['debug', 'Debug & Logs'],
              ['toolkits', 'Toolkits'],
              ['models', 'Models'],
              ['byokey', 'BYO Keys'],
              ['faq', 'FAQ'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hover:text-zinc-200">{label}</a>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">OpenClaws Documentation</h1>
        <P>Everything you need to deploy, configure, and use your managed OpenClaw gateway.</P>

        <div className="mt-10 space-y-14">

          {/* ────── OVERVIEW ────── */}
          <section>
            <H2 id="overview">What is OpenClaws?</H2>
            <P>
              OpenClaws is a managed hosting platform for <strong className="text-zinc-200">OpenClaw</strong>, the
              open-source AI assistant with 80,000+ GitHub stars. Each subscriber gets their own dedicated AI
              gateway — a 24/7 assistant running on isolated infrastructure with persistent memory, 1000+ tool
              integrations, and 8 messaging channels.
            </P>
            <P>
              Your gateway runs on its own Fly.io VM with dedicated CPU, RAM, and persistent storage. No data
              is shared between users. For deep dives into OpenClaw itself,
              see <ExtLink href="https://docs.openclaw.ai">docs.openclaw.ai</ExtLink>.
            </P>
          </section>

          {/* ────── QUICK START ────── */}
          <section>
            <H2 id="quickstart">Quick Start</H2>
            <ol className="space-y-6">
              {[
                { step: '1', title: 'Sign in', body: <>Go to <Link href="/login" className="text-zinc-200 underline hover:text-white">openclaws.biz/login</Link> and sign in with Google or X (Twitter).</> },
                { step: '2', title: 'Subscribe ($29/month)', body: <>Navigate to <strong className="text-zinc-300">Settings → Billing</strong> and click &quot;Subscribe.&quot; Your personal AI gateway deploys automatically (~30 seconds).</> },
                { step: '3', title: 'Open your Control UI', body: <>Click <strong className="text-zinc-300">&quot;Open your OpenClaw&quot;</strong> on the Dashboard. This opens your gateway&apos;s Control UI at <Code>your-name.openclaws.biz</Code>. You&apos;ll be auto-authenticated.</> },
                { step: '4', title: 'Start chatting', body: <>Use the <strong className="text-zinc-300">Chat</strong> tab in the Control UI to talk directly to your AI assistant, or connect a messaging channel (Telegram, Discord, WhatsApp, etc.).</> },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-200">{item.step}</span>
                  <div>
                    <h3 className="font-semibold text-zinc-200">{item.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ────── CONTROL UI ────── */}
          <section>
            <H2 id="control-ui">Control UI Overview</H2>
            <P>
              The Control UI is the browser-based dashboard for managing your gateway. It&apos;s organized into
              4 groups with 13 tabs:
            </P>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {[
                { group: 'Chat', tabs: ['Chat'] },
                { group: 'Control', tabs: ['Overview', 'Channels', 'Instances', 'Sessions', 'Usage', 'Cron Jobs'] },
                { group: 'Agent', tabs: ['Agents', 'Skills', 'Nodes'] },
                { group: 'Settings', tabs: ['Config', 'Debug', 'Logs'] },
              ].map((g) => (
                <div key={g.group} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-1 font-semibold text-zinc-200">{g.group}</p>
                  <ul className="space-y-0.5 text-zinc-500">{g.tabs.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              ))}
            </div>

            <H3>Accessing the Control UI</H3>
            <P>
              Your Control UI is at <Code>https://your-slug.openclaws.biz</Code>. Click &quot;Open your OpenClaw&quot;
              from the Dashboard to open it with auto-authentication. The gateway token is passed automatically
              via the URL hash.
            </P>

            <H3>Device Pairing (First Connection)</H3>
            <P>
              New browser connections require a one-time pairing approval. If you see &quot;pairing required,&quot;
              the gateway needs to approve your device. When you use the &quot;Open your OpenClaw&quot; button, the
              gateway token is included automatically — but you may still need to approve the device on first
              connection. Contact <a href="mailto:support@openclaws.biz" className="text-zinc-200 underline hover:text-white">support</a> if
              you&apos;re stuck on pairing.
            </P>
            <P>
              Each browser profile gets a unique device ID. Clearing browser data will require re-pairing.
              See <ExtLink href="https://docs.openclaw.ai/web/control-ui#device-pairing-first-connection">OpenClaw docs: Device Pairing</ExtLink> for details.
            </P>
          </section>

          {/* ────── CHAT ────── */}
          <section>
            <H2 id="chat">Chat</H2>
            <P>
              The Chat tab provides a direct conversation interface with your AI assistant. Key features:
            </P>
            <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span>Message thread with streaming responses and elapsed timer</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Session selector</strong> — switch between conversation contexts or start new ones</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Thinking toggle</strong> — show/hide the AI&apos;s reasoning process</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Focus mode</strong> — fullscreen chat with all UI chrome hidden</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span>Image paste support — paste images directly from clipboard</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span>Message queue when assistant is busy processing</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span>Stop button to abort long-running responses</li>
            </ul>
          </section>

          {/* ────── CHANNELS ────── */}
          <section>
            <H2 id="channels">Messaging Channels</H2>
            <P>
              Connect your AI assistant to 8 messaging platforms so you can talk to it from anywhere.
              Each channel has its own configuration section in the <strong className="text-zinc-200">Channels</strong> tab.
            </P>

            <div className="mt-4 space-y-2">
              <Card title="WhatsApp">
                Link via QR code. Click <strong>Show QR</strong> in the Channels tab, scan with WhatsApp on your
                phone. Use <strong>Relink</strong> if the session expires, <strong>Logout</strong> to disconnect.
              </Card>
              <Card title="Telegram">
                Create a bot via <strong>@BotFather</strong> on Telegram, copy the bot token, and paste it
                in the Telegram config section. Supports long polling (default) or webhook mode.
                Set <Code>dmPolicy</Code> to control who can message your bot (pairing/allowlist/open).
                See <ExtLink href="https://docs.openclaw.ai/channels/telegram">Telegram setup guide</ExtLink>.
              </Card>
              <Card title="Discord">
                Create a Discord bot, add it to your server, and paste the bot token in config.
                The bot responds to mentions and DMs.
              </Card>
              <Card title="Slack">
                Connects via Socket Mode. Configure your Slack app token and bot token in the config section.
              </Card>
              <Card title="Google Chat">
                Uses Chat API webhooks. Configure your service account credentials and audience settings.
              </Card>
              <Card title="Signal">
                Requires a running <Code>signal-cli</Code> REST API server. Configure the base URL in settings.
              </Card>
              <Card title="iMessage">
                macOS-only bridge. Requires a Mac running the iMessage bridge service.
              </Card>
              <Card title="Nostr">
                Decentralized DMs via NIP-04 relays. Edit your Nostr profile (name, bio, avatar, NIP-05)
                directly from the Channels tab.
              </Card>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Each channel shows live status (Configured, Running, Connected) and health metrics.
              Use the <strong>Probe</strong> button to test connectivity.
            </p>
          </section>

          {/* ────── CRON ────── */}
          <section>
            <H2 id="cron">Cron Jobs</H2>
            <P>
              Schedule recurring agent runs from the <strong className="text-zinc-200">Cron Jobs</strong> tab.
              Great for morning briefings, automated reports, monitoring, or any task you want to run on a schedule.
            </P>

            <H3>Creating a Job</H3>
            <ul className="space-y-1.5 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">1.</span><strong className="text-zinc-300">Name &amp; Agent</strong> — Give the job a name and optionally pick a specific agent</li>
              <li className="flex gap-2"><span className="text-zinc-600">2.</span><strong className="text-zinc-300">Schedule</strong> — Choose <Code>Every</Code> (e.g., every 30 minutes), <Code>At</Code> (specific datetime), or <Code>Cron</Code> (cron expression with timezone)</li>
              <li className="flex gap-2"><span className="text-zinc-600">3.</span><strong className="text-zinc-300">Execution</strong> — Run in the <strong>Main</strong> session (posts a system event) or <strong>Isolated</strong> (dedicated agent turn with your prompt)</li>
              <li className="flex gap-2"><span className="text-zinc-600">4.</span><strong className="text-zinc-300">Delivery</strong> — <strong>Announce</strong> posts a summary to chat, <strong>Webhook</strong> POSTs results to a URL, or <strong>None</strong> keeps it internal</li>
            </ul>

            <P>
              The run history panel shows all past executions with status, duration, and output.
              You can enable/disable, manually run, or delete individual jobs.
            </P>
          </section>

          {/* ────── SKILLS ────── */}
          <section>
            <H2 id="skills">Skills</H2>
            <P>
              Your gateway comes with <strong className="text-zinc-200">51 built-in skills</strong> — pre-packaged
              capabilities like GitHub, Notion, Slack, Discord, image generation, PDF editing, text-to-speech,
              and more. Manage them from the <strong className="text-zinc-200">Skills</strong> tab.
            </P>

            <H3>Skill Status</H3>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-green-500/70">●</span><strong className="text-zinc-300">Eligible</strong> — ready to use, all dependencies met</li>
              <li className="flex gap-2"><span className="text-red-500/70">●</span><strong className="text-zinc-300">Blocked</strong> — missing requirements (binary, API key, config, or OS)</li>
            </ul>

            <H3>Enabling Skills</H3>
            <P>
              For blocked skills, the UI shows exactly what&apos;s missing. Common fixes:
            </P>
            <ul className="mt-1 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Missing API key</strong> — paste your key in the skill&apos;s &quot;API key&quot; field and click Save</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Missing binary</strong> — click the &quot;Install&quot; button (e.g., &quot;Install GitHub CLI (brew)&quot;)</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Missing config</strong> — configure the related channel or plugin first</li>
            </ul>

            <H3>Popular Skills</H3>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-zinc-400 sm:grid-cols-3">
              {[
                'GitHub', 'Notion', 'Slack', 'Discord', 'WhatsApp', 'Trello',
                'Gmail (Himalaya)', 'Google Workspace', 'Apple Notes', 'Apple Reminders',
                'OpenAI Image Gen', 'Gemini Image Gen', 'PDF Editor', 'Whisper (STT)',
                'ElevenLabs (TTS)', 'Spotify', 'Weather', 'X/Twitter', 'Coding Agent',
                '1Password', 'Obsidian', 'Things 3', 'ClawHub',
              ].map((s) => <span key={s} className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1">{s}</span>)}
            </div>
          </section>

          {/* ────── AGENTS ────── */}
          <section>
            <H2 id="agents">Agents</H2>
            <P>
              The <strong className="text-zinc-200">Agents</strong> tab manages agent workspaces — isolated contexts
              with their own identity, tools, skills, and model configuration.
            </P>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Overview</strong> — workspace name, identity (name, emoji), default status</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Model Selection</strong> — set primary model and comma-separated fallbacks</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Files</strong> — list and edit agent workspace files</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Tools</strong> — tool policy editor and profiles</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Skills</strong> — per-agent skill allowlist</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Channels</strong> — per-agent channel configuration</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Cron Jobs</strong> — per-agent scheduled tasks</li>
            </ul>
            <P>
              For multi-agent architectures, see <ExtLink href="https://docs.openclaw.ai/concepts/multi-agent">OpenClaw docs: Multi-Agent</ExtLink>.
            </P>
          </section>

          {/* ────── SESSIONS ────── */}
          <section>
            <H2 id="sessions">Sessions</H2>
            <P>
              The <strong className="text-zinc-200">Sessions</strong> tab shows all active conversation sessions with
              per-session overrides:
            </P>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Thinking</strong> — off / minimal / low / medium / high (controls how much reasoning the AI shows)</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Verbose</strong> — inherit / off / on / full (controls response detail level)</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Reasoning</strong> — inherit / off / on / stream (controls reasoning output mode)</li>
            </ul>
            <P>
              Each session shows its key, label, kind (direct/channel), last update time, and token usage
              against the context limit (e.g., 14,809 / 200,000). You can delete individual sessions to free resources.
            </P>
          </section>

          {/* ────── USAGE ────── */}
          <section>
            <H2 id="usage">Usage Monitoring</H2>
            <P>
              The <strong className="text-zinc-200">Usage</strong> tab provides comprehensive token and cost analytics:
            </P>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Date range filters</strong> — Today, 7d, 30d, or custom range</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Token vs Cost view</strong> — toggle between raw token counts and estimated costs</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Activity timeline</strong> — visualize when your gateway is busiest</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Session breakdown</strong> — per-session token usage, error counts, message counts</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Advanced filters</strong> — filter by session key, model, provider, agent, channel</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Export</strong> — export usage data for external analysis</li>
            </ul>
          </section>

          {/* ────── NODES ────── */}
          <section>
            <H2 id="nodes">Nodes &amp; Devices</H2>
            <P>
              The <strong className="text-zinc-200">Nodes</strong> tab manages execution security and device access.
            </P>

            <H3>Exec Approvals</H3>
            <P>
              Control what commands the AI can execute on its own:
            </P>
            <ul className="mt-1 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Deny</strong> — block all exec commands (most secure)</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Allowlist</strong> — only pre-approved commands can run</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Full</strong> — allow all commands (least secure)</li>
            </ul>
            <P>
              The &quot;Ask&quot; policy controls whether the UI prompts you for approval:
              Off (never ask), On miss (ask for unknown commands), Always.
            </P>

            <H3>Device Management</H3>
            <P>
              View paired devices, rotate or revoke device tokens, and manage pending pairing requests.
              Each device has scoped roles (operator, admin, read, write, approvals, pairing).
            </P>
          </section>

          {/* ────── CONFIG ────── */}
          <section>
            <H2 id="config">Configuration</H2>
            <P>
              The <strong className="text-zinc-200">Config</strong> tab provides a full settings editor for your
              gateway. It edits <Code>~/openclaw/openclaw.json</Code> with 25+ categories:
            </P>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-500">
              {[
                'Environment', 'Updates', 'Agents', 'Authentication', 'Channels', 'Messages',
                'Commands', 'Hooks', 'Skills', 'Tools', 'Gateway', 'Setup Wizard', 'Meta',
                'Diagnostics', 'Logging', 'CLI', 'Browser', 'UI', 'Secrets', 'Models',
              ].map((c) => <span key={c} className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1">{c}</span>)}
            </div>
            <P>
              Use the search bar to find specific settings. Toggle between Form view (structured UI)
              and Raw view (JSON editor). Changes are validated before saving.
              See <ExtLink href="https://docs.openclaw.ai/gateway/configuration">OpenClaw docs: Configuration</ExtLink> for all available options.
            </P>
          </section>

          {/* ────── DEBUG & LOGS ────── */}
          <section>
            <H2 id="debug">Debug &amp; Logs</H2>
            <P>
              Two tabs for troubleshooting:
            </P>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Debug</strong> — Raw JSON snapshots (status, health, heartbeat), manual RPC calls to the gateway, model catalog</li>
              <li className="flex gap-2"><span className="text-zinc-600">•</span><strong className="text-zinc-300">Logs</strong> — Live JSONL log tail with 6 log levels (trace/debug/info/warn/error/fatal), text search, auto-follow, and export</li>
            </ul>
          </section>

          {/* ────── TOOLKITS ────── */}
          <section>
            <H2 id="toolkits">Connecting Toolkits</H2>
            <P>
              OpenClaws integrates with 1000+ services through Composio. Toolkits are OAuth-connected external
              services (Gmail, GitHub, Slack, etc.) managed from the OpenClaws dashboard — distinct from
              the <strong className="text-zinc-200">Skills</strong> in the Control UI, which are built-in gateway capabilities.
              To connect a toolkit:
            </P>
            <ol className="mt-2 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-500">1.</span>Go to the <strong className="text-zinc-200">Toolkits</strong> page in the OpenClaws dashboard</li>
              <li className="flex gap-2"><span className="text-zinc-500">2.</span>Search for the service you want (Gmail, Slack, GitHub, etc.)</li>
              <li className="flex gap-2"><span className="text-zinc-500">3.</span>Click <strong className="text-zinc-200">Connect</strong> and authorize via OAuth</li>
              <li className="flex gap-2"><span className="text-zinc-500">4.</span>Once connected, your assistant can use that tool in conversations</li>
            </ol>
          </section>

          {/* ────── MODELS ────── */}
          <section>
            <H2 id="models">Choosing a Model</H2>
            <P>
              OpenClaws supports multiple AI models. Switch models in <strong className="text-zinc-200">Settings → Model Selection</strong> on
              the OpenClaws dashboard, or in <strong className="text-zinc-200">Agents → Model Selection</strong> in the Control UI:
            </P>
            <div className="mt-3 space-y-2">
              <Card title="Claude Sonnet 4.6 (default)">Fast, capable, great for everyday tasks. Included with your subscription.</Card>
              <Card title="Claude Opus 4.6">Most capable model. Best for complex reasoning and analysis. Included with your subscription.</Card>
              <Card title="GPT-5.3">OpenAI&apos;s latest model. Requires your own OpenAI API key.</Card>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 opacity-50">
                <p className="text-sm font-semibold text-zinc-300">GPT-5.4 <span className="ml-1 text-xs font-normal text-zinc-500">Coming Soon</span></p>
              </div>
            </div>
          </section>

          {/* ────── BYO KEYS ────── */}
          <section>
            <H2 id="byokey">Bring Your Own API Keys</H2>
            <P>
              Use your own API keys for full control over costs and model access:
            </P>
            <ul className="mt-2 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span><strong className="text-zinc-200">Anthropic API Key</strong> — starts with <Code>sk-ant-api...</Code></span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span><strong className="text-zinc-200">Anthropic OAuth Token</strong> — starts with <Code>sk-ant-oat01-...</Code> (from <Code>claude setup-token</Code>)</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span><strong className="text-zinc-200">OpenAI API Key</strong> — starts with <Code>sk-...</Code></span></li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              All keys are encrypted at rest using AES-256 via Supabase pgcrypto. Keys are only decrypted server-side when pushed to your isolated gateway.
            </p>
          </section>

          {/* ────── FAQ ────── */}
          <section>
            <H2 id="faq">FAQ</H2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">What happens to my data?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Each user gets an isolated Fly.io VM with its own persistent storage. Your conversations
                  and memories are stored only on your gateway. See our <Link href="/privacy" className="text-zinc-200 underline hover:text-white">Privacy Policy</Link>.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Can I cancel anytime?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Yes. Cancel any time from Settings. Your gateway runs until the end of your billing period.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Do I need my own API keys?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  No. Claude Sonnet 4.6 and Claude Opus 4.6 are included with your subscription. You only
                  need your own key for GPT-5.3 or if you prefer direct billing from the AI provider.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">How do messaging channels work?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Your gateway supports 8 channels: WhatsApp, Telegram, Discord, Slack, Google Chat, Signal,
                  iMessage, and Nostr. Configure them in the Control UI&apos;s Channels tab. Once connected,
                  message your AI assistant from any platform.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">What are skills?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Skills are pre-packaged capabilities your AI assistant can use — like managing GitHub issues,
                  creating Notion pages, generating images, or controlling smart home devices. Your gateway
                  ships with 51 built-in skills. Enable them in the Skills tab.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Can I schedule automated tasks?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Yes. Use Cron Jobs to schedule recurring agent runs — morning briefings, automated reports,
                  monitoring tasks, or anything on a schedule. Supports interval, fixed-time, and cron expressions.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Where can I find more help?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  For OpenClaw-specific features, see <ExtLink href="https://docs.openclaw.ai">docs.openclaw.ai</ExtLink>.
                  For OpenClaws platform support, join our <ExtLink href="https://discord.gg/bearified">Discord</ExtLink> or
                  email <a href="mailto:support@openclaws.biz" className="text-zinc-200 underline hover:text-white">support@openclaws.biz</a>.
                </p>
              </div>
            </div>
          </section>

          {/* ────── SUPPORT ────── */}
          <section>
            <H2 id="support">Support</H2>
            <P>
              Need help? Join our <ExtLink href="https://discord.gg/bearified">Discord community</ExtLink> or
              email us at <a href="mailto:support@openclaws.biz" className="text-zinc-200 underline hover:text-white">support@openclaws.biz</a>.
              For OpenClaw documentation, visit <ExtLink href="https://docs.openclaw.ai">docs.openclaw.ai</ExtLink>.
            </P>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#0F0F0F] py-8">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
            <span>&copy; 2026 BearifiedCo. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
              <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
              <Link href="/" className="hover:text-zinc-300">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
