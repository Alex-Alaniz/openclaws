import Link from 'next/link';

export const metadata = {
  title: 'Documentation — OpenClaws',
  description: 'Learn how to set up and use OpenClaws, your managed AI assistant platform.',
};

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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Getting Started</h1>
        <p className="mb-10 text-zinc-400">Everything you need to go from signup to your first conversation.</p>

        <div className="space-y-12">
          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="overview">What is OpenClaws?</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              OpenClaws is a managed hosting platform for{' '}
              <strong className="text-zinc-200">OpenClaw</strong>, an open-source AI assistant.
              Each subscriber gets their own dedicated AI gateway — a 24/7 assistant that connects
              to 1000+ tools and services through your messaging channels.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="quickstart">Quick Start (3 minutes)</h2>
            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-200">1</span>
                <div>
                  <h3 className="font-semibold text-zinc-200">Sign in</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Go to <Link href="/login" className="text-zinc-200 underline hover:text-white">openclaws.biz/login</Link> and
                    sign in with Google or X (Twitter). Signing in automatically creates your account.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-200">2</span>
                <div>
                  <h3 className="font-semibold text-zinc-200">Subscribe ($29/month)</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Navigate to <strong className="text-zinc-300">Settings → Billing</strong> and click
                    &quot;Subscribe.&quot; After payment, your personal AI gateway is automatically deployed —
                    usually takes about 30 seconds.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-200">3</span>
                <div>
                  <h3 className="font-semibold text-zinc-200">Start chatting</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Once your gateway shows a green &quot;connected&quot; status, you can start chatting
                    from the Dashboard. Ask your assistant anything — it has access to all your connected tools.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="toolkits">Connecting Toolkits</h2>
            <p className="mb-3 text-sm text-zinc-400">
              OpenClaws integrates with 1000+ services through Composio. To connect a tool:
            </p>
            <ol className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-500">1.</span>
                Go to the <strong className="text-zinc-200">Toolkits</strong> page
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500">2.</span>
                Search for the service you want (Gmail, Slack, GitHub, etc.)
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500">3.</span>
                Click <strong className="text-zinc-200">Connect</strong> and authorize via OAuth
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500">4.</span>
                Once connected, your assistant can use that tool in conversations
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="models">Choosing a Model</h2>
            <p className="mb-3 text-sm text-zinc-400">
              OpenClaws supports multiple AI models. You can switch models anytime in <strong className="text-zinc-200">Settings → Model Selection</strong>:
            </p>
            <div className="space-y-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-semibold text-zinc-200">Claude Sonnet 4 <span className="font-normal text-zinc-500">(default)</span></p>
                <p className="text-xs text-zinc-500">Fast, capable, great for everyday tasks. Included with your subscription.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-semibold text-zinc-200">Claude Opus 4</p>
                <p className="text-xs text-zinc-500">Most capable model. Best for complex reasoning and analysis. Included with your subscription.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-semibold text-zinc-200">GPT-4o</p>
                <p className="text-xs text-zinc-500">OpenAI&apos;s multimodal model. Requires your own OpenAI API key.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="byokey">Bring Your Own API Keys</h2>
            <p className="mb-3 text-sm text-zinc-400">
              You can use your own API keys for full control over costs and model access:
            </p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-500">•</span>
                <span><strong className="text-zinc-200">Anthropic API Key</strong> — paste a key starting with <code className="rounded bg-zinc-800 px-1 text-xs text-zinc-300">sk-ant-api...</code></span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500">•</span>
                <span><strong className="text-zinc-200">Anthropic OAuth Token</strong> — paste a token starting with <code className="rounded bg-zinc-800 px-1 text-xs text-zinc-300">sk-ant-oat01-...</code> (from <code className="rounded bg-zinc-800 px-1 text-xs text-zinc-300">claude setup-token</code>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500">•</span>
                <span><strong className="text-zinc-200">OpenAI API Key</strong> — paste a key starting with <code className="rounded bg-zinc-800 px-1 text-xs text-zinc-300">sk-...</code></span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              All keys are encrypted at rest using AES-256 via Supabase pgcrypto. Keys are only decrypted server-side when pushed to your isolated gateway.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="faq">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">What happens to my data?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Each user gets an isolated Fly.io VM with its own persistent storage. Your conversations
                  and memories are stored only on your gateway. See our <Link href="/privacy" className="text-zinc-200 underline hover:text-white">Privacy Policy</Link> for details.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Can I cancel anytime?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Yes. You can cancel your subscription at any time. When cancelled, your gateway will be
                  shut down at the end of your billing period.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Do I need my own API keys?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  No. Claude Sonnet 4 and Claude Opus 4 are included with your subscription using platform-managed
                  access. You only need your own key if you want to use GPT-4o or prefer direct billing from the AI provider.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">What are messaging channels?</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Telegram, Discord, and WhatsApp integration is coming soon. Once live, you&apos;ll be able to
                  message your AI assistant from any of these platforms instead of just the web dashboard.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-zinc-100" id="support">Support</h2>
            <p className="text-sm text-zinc-400">
              Need help? Join our <a href="https://discord.gg/bearified" target="_blank" rel="noopener noreferrer" className="text-zinc-200 underline hover:text-white">Discord community</a> or
              email us at <a href="mailto:support@openclaws.biz" className="text-zinc-200 underline hover:text-white">support@openclaws.biz</a>.
            </p>
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
