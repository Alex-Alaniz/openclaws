'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InstanceData = {
  status: string;
  gateway_url: string | null;
};

export default function DashboardPage() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = draft.trim().length > 0 && !isLoading;

  // Fetch instance status
  useEffect(() => {
    fetch('/api/instance')
      .then((r) => r.json())
      .then((data: { instance: InstanceData | null }) => setInstance(data.instance))
      .catch(() => {})
      .finally(() => setInstanceLoading(false));
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
    if (!text || isLoading) return;

    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong'}` },
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
        { role: 'assistant', content: 'Error: Failed to connect to gateway' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [draft, isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const gatewayReady = instance?.status === 'running' && instance?.gateway_url;

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
          ) : (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>No gateway — </span>
              <a href="/dashboard/settings" className="font-semibold text-zinc-200 hover:text-zinc-100">
                Deploy one in Settings
              </a>
            </>
          )}
        </div>

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="mb-2 text-lg font-semibold text-zinc-200">OpenClaw</h2>
                <p className="text-sm text-zinc-500">
                  {gatewayReady
                    ? 'Send a message to start chatting with your AI assistant.'
                    : 'Deploy a gateway in Settings to start chatting.'}
                </p>
              </div>
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
              disabled={!gatewayReady}
              className="max-h-[200px] min-h-[44px] w-full resize-none rounded-[14px] border border-white/[0.1] bg-white/[0.045] px-3 py-2 text-sm text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-1 focus:ring-white/[0.22] disabled:opacity-50"
              placeholder={gatewayReady ? 'Ask me anything...' : 'Deploy a gateway to start chatting...'}
            />
            <button
              onClick={sendMessage}
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

      {/* Tool execution panel */}
      <div className="hidden w-[400px] shrink-0 border-l border-white/[0.1] md:block lg:w-[500px]">
        <div className="flex h-full flex-col overflow-hidden bg-[#1a1a1a]">
          <div className="flex items-center gap-2 border-b border-white/[0.1] px-4 py-3">
            <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="font-mono text-xs font-medium text-zinc-100">Tool Execution</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2">
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center font-mono text-xs text-zinc-500/50">
                <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <p>Tool calls will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
