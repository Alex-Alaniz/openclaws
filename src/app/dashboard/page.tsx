'use client';

import { useState } from 'react';

export default function DashboardPage() {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080808]">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1360px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative flex min-h-0 flex-col border-r border-white/[0.06] bg-[#080808]">
          <div className="flex-1 overflow-y-auto px-4 py-10 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[840px] space-y-8">
              <div className="ml-auto w-fit rounded-[20px] border border-white/[0.12] bg-[#111111] px-5 py-3 text-[13px] font-bold tracking-tight text-zinc-200 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)]">
                What&apos;s up OpenClaw!
              </div>

              <div className="max-w-[720px] rounded-[26px] border border-white/[0.08] bg-[#0F0F0F] px-7 py-6 text-[26px] font-bold leading-[1.4] tracking-tight text-[#F9FAFB] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.6)]">
                Claude Opus 4.6 is now active. You have full access to advanced tool execution and persistent memory.
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] bg-[#0A0A0A]/80 px-4 py-6 backdrop-blur-md sm:px-6 xl:px-8">
            <div className="mx-auto flex w-full max-w-[840px] items-center gap-3">
              <div className="relative flex-1">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-13 w-full resize-none rounded-full border border-white/[0.12] bg-[#121212] px-6 py-3.5 text-[15px] font-medium text-white outline-none ring-0 transition-all placeholder:text-zinc-600 focus:border-white/25 focus:bg-[#161616]"
                  placeholder="Ask OpenClaw anything..."
                />
              </div>
              <button 
                className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold transition-all active:scale-[0.95] ${
                  canSend ? 'bg-white text-black hover:scale-[1.05] hover:bg-zinc-100' : 'bg-white/10 text-zinc-600 cursor-not-allowed'
                }`}
                disabled={!canSend}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 7-7 7 7M12 5v14" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] font-bold tracking-wide text-zinc-600 uppercase">
              Pro tip: Connect toolkits to enable autonomous actions
            </p>
          </div>
        </section>

        <aside className="hidden flex-col bg-[#090909] xl:flex">
          <div className="flex h-[60px] items-center justify-between border-b border-white/[0.06] px-5">
            <h2 className="text-[14px] font-bold tracking-tight text-zinc-200">Mission Control</h2>
            <button className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:text-white">Collapse</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-10">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-zinc-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <h3 className="text-[14px] font-bold text-zinc-300">No active tasks</h3>
              <p className="mt-1 text-[12px] font-medium text-zinc-600">Tool calls and execution status will appear here in real-time.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
