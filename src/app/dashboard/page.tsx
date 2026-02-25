'use client';

import { useState } from 'react';

export default function DashboardPage() {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0;

  return (
    <div className="h-full bg-[#090909]">
      <div className="flex h-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-center gap-1.5 bg-[#152742]/60 py-2 text-xs text-[#6EA8FF]">
            <span>You can build this and more with</span>
            <a
              href="https://composio.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-px font-medium transition-colors hover:text-[#91BEFF]"
            >
              <span className="inline-block h-3 w-3 bg-current opacity-70 transition-opacity group-hover:opacity-100" />
              <span>Composio</span>
            </a>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="h-full overflow-y-auto">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 md:p-6">
                <div className="flex items-start justify-end">
                  <div className="rounded-2xl border border-white/10 bg-[#111111] px-4 py-2 text-sm text-zinc-100">What&apos;s up!</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111111] px-5 py-4 text-[17px] leading-relaxed text-zinc-100 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                  Claude Opus 4.6 is only available for paid users. Please add credits or switch to Claude Sonnet 4.5 in your{' '}
                  <a href="/dashboard/settings" className="text-zinc-300 underline decoration-white/30 underline-offset-2 hover:text-white">
                    settings
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0B0B0B] p-3 md:p-4">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask me anything..."
                className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-base text-white outline-none placeholder:text-zinc-500 focus:border-white/30 focus-visible:ring-1 focus-visible:ring-white/30 md:text-sm"
              />
              <button
                className={`size-10 shrink-0 rounded-xl text-sm font-semibold transition-colors ${
                  canSend ? 'bg-white text-black hover:bg-zinc-200' : 'cursor-not-allowed bg-white/80 text-black/70 opacity-50'
                }`}
                disabled={!canSend}
              >
                ↑
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-[400px] shrink-0 border-l border-white/10 md:block lg:w-[500px]">
          <div className="flex h-full flex-col overflow-hidden bg-[#101010]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="font-mono text-xs font-medium text-zinc-100">Tool Execution</span>
              <button className="ml-auto inline-flex items-center gap-1.5 rounded-md p-1.5 text-xs text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200">
                Hide
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2">
              <div className="flex h-full items-center justify-center">
                <div className="text-center font-mono text-xs text-zinc-500/50">
                  <p>Tool calls will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
