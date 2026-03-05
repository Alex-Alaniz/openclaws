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
        <div className="flex items-center justify-center gap-1.5 border-b border-white/[0.08] bg-[#121212] py-2 text-xs text-zinc-400">
          {instanceLoading ? (
            <span>Checking gateway status...</span>
          ) : gatewayReady ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Gateway connected</span>
            </>
          ) : hasByoKey ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>BYO Key Chat</span>
              <span className="text-zinc-600">·</span>
              <a href="/dashboard/settings" className="text-zinc-500 hover:text-zinc-300">
                Upgrade for full gateway
              </a>
            </>
          ) : (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>No gateway — </span>
              <a href="/dashboard/settings" className="font-semibold text-zinc-200 hover:text-zinc-100">
                Add API key or deploy gateway
              </a>
            </>
          )}
        </div>

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              {gatewayReady ? (
                <div className="w-full max-w-md space-y-6 px-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-lg font-bold text-zinc-100">Your OpenClaw is running</h2>
                    <p className="mb-4 text-sm text-zinc-400">
                      Access the full experience — browser automation, 5400+ skills, messaging channels, and persistent memory.
                    </p>
                    <a
                      href="/api/gateway/open"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                    >
                      Open your OpenClaw
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Or send a quick message below</p>
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
                    <h2 className="mb-2 text-lg font-bold text-zinc-100">BYO Key Chat</h2>
                    <p className="mb-3 text-sm text-zinc-400">
                      Chat directly using your own API key. No subscription required.
                    </p>
                    <p className="text-xs text-zinc-500">
                      Using {providerKeys.find(k => k.provider === 'anthropic' || k.provider === 'openai')?.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} key ({providerKeys.find(k => k.provider === 'anthropic' || k.provider === 'openai')?.keySuffix ?? ''})
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-2 text-xs text-zinc-500">Send a message to start chatting</p>
                    <p className="text-xs text-zinc-600">
                      Want browser automation, skills, and channels?{' '}
                      <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">Upgrade to Pro</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-4 px-4">
                  <div className="text-center">
                    <img src="/openclaw.svg" alt="OpenClaws" className="mx-auto mb-3 h-10 w-10 opacity-60" />
                    <h2 className="text-xl font-bold text-zinc-100">Welcome to OpenClaws</h2>
                    <p className="mt-1 text-sm text-zinc-500">Get your AI assistant running in 3 steps</p>
                  </div>
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${subActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${subActive ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                        {subActive ? '✓' : '1'}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${subActive ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {subActive ? 'Subscribed' : 'Subscribe to OpenClaws Pro'}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {subActive ? 'Your subscription is active.' : '$29/month — includes your dedicated AI gateway.'}
                        </p>
                        {!subActive ? (
                          <Link href="/dashboard/settings" className="mt-2 inline-block rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                            Subscribe
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${instance?.status === 'running' ? 'border-emerald-500/30 bg-emerald-500/5' : instance?.status === 'provisioning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${instance?.status === 'running' ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                        {instance?.status === 'running' ? '✓' : '2'}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${instance?.status === 'running' ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {instance?.status === 'running' ? 'Gateway deployed' : instance?.status === 'provisioning' ? 'Gateway deploying...' : 'Deploy your AI gateway'}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {instance?.status === 'running' ? 'Your gateway is live and ready.' : instance?.status === 'provisioning' ? 'This usually takes about 30 seconds.' : 'Auto-deploys after subscription, or deploy manually in Settings.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">3</div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">Open your OpenClaw</p>
                        <p className="mt-0.5 text-xs text-zinc-500">Access your full AI assistant — browse the web, automate tasks, and more.</p>
                        <p className="mt-2 text-xs text-zinc-600">
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
                        : 'bg-[#1a1a1a] text-zinc-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-400">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.1] bg-[#101010] p-3 md:p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={!chatEnabled}
              aria-label="Type your message"
              className="max-h-[200px] min-h-[44px] w-full resize-none rounded-[14px] border border-white/[0.1] bg-white/[0.045] px-3 py-2 text-sm text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-1 focus:ring-white/[0.22] disabled:opacity-50"
              placeholder={chatEnabled ? 'Send a message...' : 'Add an API key or deploy a gateway to start chatting...'}
            />
            <button
              onClick={sendMessage}
              aria-label="Send message"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-black transition-all ${
                canSend ? 'opacity-100 hover:bg-zinc-100' : 'cursor-not-allowed opacity-50'
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
      <div className="hidden w-[400px] shrink-0 border-l border-white/[0.1] md:block lg:w-[500px]">
        <div className="flex h-full flex-col overflow-hidden bg-[#1a1a1a]">
          <div className="flex items-center gap-2 border-b border-white/[0.1] px-4 py-3">
            <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="font-mono text-xs font-medium text-zinc-100">Gateway Status</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {instanceLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center font-mono text-xs text-zinc-500/70">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-500" />
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
                      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
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
                    Open Control UI
                  </a>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#121212] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">Gateway URL</div>
                  <div className="mt-1 truncate font-mono text-xs text-zinc-100">{instance?.gateway_url}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
                  <div className="rounded-lg border border-white/[0.06] bg-[#0f0f0f] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">Region</div>
                    <div className="mt-1 font-mono text-[11px] text-zinc-200">{instance?.fly_region ?? '—'}</div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0f0f0f] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">Status</div>
                    <div className="mt-1 font-mono text-[11px] text-zinc-200">running</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center font-mono text-xs text-zinc-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-600" />
                  <p className="text-zinc-400">No gateway deployed</p>
                  <Link
                    href="/dashboard/settings"
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-zinc-100 transition hover:border-white/30 hover:text-white"
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
