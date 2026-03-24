'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trackMessageSent } from '@/lib/analytics';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InstanceData = {
  status: string;
  gateway_url: string | null;
  fly_region?: string | null;
};

type ProviderKeyInfo = {
  provider: string;
  keyType: string;
  keySuffix: string;
  validated: boolean;
};

export default function DashboardPage() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(true);
  const [subActive, setSubActive] = useState<boolean | null>(null);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const gatewayReady = instance?.status === 'running' && instance?.gateway_url;
  const hasByoKey = providerKeys.some(k => k.provider === 'anthropic' || k.provider === 'openai');
  const chatMode: 'gateway' | 'byo' | 'none' = gatewayReady ? 'gateway' : hasByoKey ? 'byo' : 'none';
  const chatEnabled = chatMode !== 'none';
  const canSend = draft.trim().length > 0 && !isLoading && chatEnabled;

  const friendlyError = (raw: string | undefined): string => {
    const msg = (raw ?? '').toLowerCase();
    if (msg.includes('failed to connect to gateway') || msg.includes('gateway') && msg.includes('unreachable'))
      return 'Your gateway seems unreachable. Check Settings to verify your instance is running.';
    if (msg.includes('connection error') || msg.includes('connect'))
      return "Couldn't connect. Please try again in a moment.";
    return 'Something went wrong. Please try again.';
  };

  // Fetch instance, subscription, and provider keys status
  useEffect(() => {
    fetch('/api/instance')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/login'; return null; }
        return r.json();
      })
      .then((data: { instance: InstanceData | null } | null) => { if (data) setInstance(data.instance); })
      .catch(() => {})
      .finally(() => setInstanceLoading(false));
    fetch('/api/subscription')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/login'; return null; }
        return r.json();
      })
      .then((data: { active: boolean } | null) => { if (data) setSubActive(data.active); })
      .catch(() => {});
    fetch('/api/provider-keys')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/login'; return null; }
        return r.ok ? r.json() : null;
      })
      .then((data: { keys: ProviderKeyInfo[] } | null) => { if (data?.keys) setProviderKeys(data.keys); })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }, []);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || isLoading || !chatEnabled) return;

    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    trackMessageSent();
    setIsLoading(true);

    const endpoint = chatMode === 'gateway' ? '/api/chat' : '/api/chat-lite';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }

      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        // BYO mode errors are already user-friendly; gateway errors need friendlyError mapping
        const errorMessage = chatMode === 'byo'
          ? (data.error ?? 'Something went wrong. Please try again.')
          : friendlyError(data.error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorMessage },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message ?? '' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: chatMode === 'gateway'
          ? 'Your gateway seems unreachable. Check Settings to verify your instance is running.'
          : 'Failed to reach the AI provider. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [draft, isLoading, chatEnabled, chatMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Status bar */}
        <div className="flex items-center justify-center gap-1.5 border-b border-[var(--oc-border)] bg-[var(--oc-bg-accent)] py-2 text-xs text-[var(--oc-muted)]">
          {instanceLoading ? (
            <span>Checking gateway status...</span>
          ) : gatewayReady ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Connected to your agent</span>
            </>
          ) : hasByoKey ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>BYO Key Chat</span>
              <span className="text-[var(--oc-muted-strong)]">·</span>
              <a href="/dashboard/settings" className="text-[var(--oc-muted)] hover:text-[var(--oc-text)]">
                Upgrade for full gateway
              </a>
            </>
          ) : (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--oc-muted)]" />
              <span>No gateway — </span>
              <a href="/dashboard/settings" className="font-semibold text-[var(--oc-text)] hover:text-[var(--oc-text-strong)]">
                Add API key or deploy gateway
              </a>
            </>
          )}
        </div>

        {/* Gateway launch banner — always visible when gateway is running */}
        {gatewayReady && (
          <div className="flex items-center justify-between border-b border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-2.5">
            <span className="text-sm text-[var(--oc-text)]">Your gateway is live and ready.</span>
            <a
              href="/api/gateway/open"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Launch Control UI
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        )}

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              {gatewayReady ? (
                <div className="w-full max-w-md space-y-4 px-4 text-center">
                  <img src="/openclaw.svg" alt="OpenClaws" className="mx-auto h-12 w-12 opacity-40" />
                  <div>
                    <h2 className="text-lg font-bold text-[var(--oc-text-strong)]">Welcome back</h2>
                    <p className="mt-1 text-sm text-[var(--oc-muted)]">
                      Chat with your AI agent below, or launch the Control UI for browser automation, skills, and more.
                    </p>
                  </div>
                </div>
              ) : hasByoKey ? (
                <div className="w-full max-w-md space-y-6 px-4">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                      <svg className="h-7 w-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-lg font-bold text-[var(--oc-text-strong)]">BYO Key Chat</h2>
                    <p className="mb-3 text-sm text-[var(--oc-muted)]">
                      Chat directly using your own API key. No subscription required.
                    </p>
                    <p className="text-xs text-[var(--oc-muted)]">
                      Using {providerKeys.find(k => k.provider === 'anthropic' || k.provider === 'openai')?.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} key ({providerKeys.find(k => k.provider === 'anthropic' || k.provider === 'openai')?.keySuffix ?? ''})
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-2 text-xs text-[var(--oc-muted)]">Send a message to start chatting</p>
                    <p className="text-xs text-[var(--oc-muted-strong)]">
                      Want browser automation, skills, and channels?{' '}
                      <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">Upgrade to Pro</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-4 px-4">
                  <div className="text-center">
                    <img src="/openclaw.svg" alt="OpenClaws" className="mx-auto mb-3 h-10 w-10 opacity-60" />
                    <h2 className="text-xl font-bold text-[var(--oc-text-strong)]">Welcome to OpenClaws</h2>
                    <p className="mt-1 text-sm text-[var(--oc-muted)]">Get your AI assistant running in 3 steps</p>
                  </div>
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${subActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-[var(--oc-bg-accent)]'}`}>
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${subActive ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-[var(--oc-text)]'}`}>
                        {subActive ? '✓' : '1'}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${subActive ? 'text-emerald-300' : 'text-[var(--oc-text)]'}`}>
                          {subActive ? 'Subscribed' : 'Subscribe to OpenClaws Pro'}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--oc-muted)]">
                          {subActive ? 'Your subscription is active.' : '$29/month — includes your dedicated AI gateway.'}
                        </p>
                        {!subActive ? (
                          <Link href="/dashboard/settings" className="mt-2 inline-block rounded-lg bg-[var(--oc-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                            Subscribe
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${instance?.status === 'running' ? 'border-emerald-500/30 bg-emerald-500/5' : instance?.status === 'provisioning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-[var(--oc-bg-accent)]'}`}>
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${instance?.status === 'running' ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-[var(--oc-text)]'}`}>
                        {instance?.status === 'running' ? '✓' : '2'}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${instance?.status === 'running' ? 'text-emerald-300' : 'text-[var(--oc-text)]'}`}>
                          {instance?.status === 'running' ? 'Gateway deployed' : instance?.status === 'provisioning' ? 'Gateway deploying...' : 'Deploy your AI gateway'}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--oc-muted)]">
                          {instance?.status === 'running' ? 'Your gateway is live and ready.' : instance?.status === 'provisioning' ? 'This usually takes about 30 seconds.' : 'Auto-deploys after subscription, or deploy manually in Settings.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-[var(--oc-bg-accent)] p-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-[var(--oc-text)]">3</div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--oc-text)]">Launch Control UI</p>
                        <p className="mt-0.5 text-xs text-[var(--oc-muted)]">Your full AI assistant — browse the web, automate tasks, and more.</p>
                        <p className="mt-2 text-xs text-[var(--oc-muted-strong)]">
                          Gateway URL appears here after deployment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-white/10 text-white'
                        : 'bg-[var(--oc-card)] text-[var(--oc-text)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[var(--oc-card)] px-4 py-2.5 text-sm text-[var(--oc-muted)]">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-3 md:p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={!chatEnabled}
              aria-label="Type your message"
              className="max-h-[200px] min-h-[44px] w-full resize-none rounded-[14px] border border-[var(--oc-border)] bg-[var(--oc-card)] px-3 py-2 text-sm text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-[var(--oc-muted)] focus:border-[var(--oc-border-strong)] focus:ring-1 focus:ring-[var(--oc-border-strong)] disabled:opacity-50"
              placeholder={chatEnabled ? 'Send a message...' : 'Add an API key or deploy a gateway to start chatting...'}
            />
            <button
              onClick={sendMessage}
              aria-label="Send message"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-black transition-all ${
                canSend ? 'opacity-100 hover:bg-[var(--oc-bg-hover)]' : 'cursor-not-allowed opacity-50'
              }`}
              disabled={!canSend}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Gateway status panel (desktop only) */}
      <div className="hidden w-[400px] shrink-0 border-l border-[var(--oc-border)] md:block lg:w-[500px]">
        <div className="flex h-full flex-col overflow-hidden bg-[var(--oc-card)]">
          <div className="flex items-center gap-2 border-b border-[var(--oc-border)] px-4 py-3">
            <svg className="h-4 w-4 text-[var(--oc-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="font-mono text-xs font-medium text-[var(--oc-text-strong)]">Gateway Status</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {instanceLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center font-mono text-xs text-[var(--oc-muted)]/70">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--oc-muted)]" />
                  <p>Checking gateway status...</p>
                </div>
              </div>
            ) : gatewayReady ? (
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">Running</span>
                    {instance?.fly_region ? (
                      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--oc-muted)]">
                        {instance.fly_region}
                      </span>
                    ) : null}
                  </div>
                  <a
                    href="/api/gateway/open"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/80 hover:bg-emerald-500/20"
                  >
                    Launch
                  </a>
                </div>

                <div className="rounded-xl border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--oc-muted)]">Gateway URL</div>
                  <div className="mt-1 truncate font-mono text-xs text-[var(--oc-text-strong)]">{instance?.gateway_url}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--oc-muted)]">
                  <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--oc-muted)]">Region</div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--oc-text)]">{instance?.fly_region ?? '—'}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-bg-accent)] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--oc-muted)]">Status</div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--oc-text)]">running</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center font-mono text-xs text-[var(--oc-muted)]">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--oc-muted-strong)]" />
                  <p className="text-[var(--oc-muted)]">No gateway deployed</p>
                  <Link
                    href="/dashboard/settings"
                    className="rounded-lg border border-[var(--oc-border)] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[var(--oc-text-strong)] transition hover:border-white/30 hover:text-white"
                  >
                    Go to Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
