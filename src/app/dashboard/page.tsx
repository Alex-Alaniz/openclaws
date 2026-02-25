'use client';

import { useState } from 'react';

export default function DashboardPage() {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-center gap-1.5 border-b border-white/[0.08] bg-[#121212] py-2 text-xs text-zinc-400">
          <span>You can build this and more with</span>
          <a href="https://composio.dev" target="_blank" rel="noopener noreferrer" className="font-semibold text-zinc-200 hover:text-zinc-100">
            Composio
          </a>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" />

        <div className="border-t border-white/[0.1] bg-[#101010] p-3 md:p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="max-h-[200px] min-h-[44px] w-full resize-none rounded-[14px] border border-white/[0.1] bg-white/[0.045] px-3 py-2 text-sm text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-1 focus:ring-white/[0.22]"
              placeholder="Ask me anything..."
            />
            <button
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

      <div className="hidden w-[400px] shrink-0 border-l border-white/[0.1] md:block lg:w-[500px]">
        <div className="flex h-full flex-col overflow-hidden bg-[#1a1a1a]">
          <div className="flex items-center gap-2 border-b border-white/[0.1] px-4 py-3">
            <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="font-mono text-xs font-medium text-zinc-100">Tool Execution</span>
            <button className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] p-1.5 text-xs text-zinc-400 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#252525] hover:text-zinc-100">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Hide
            </button>
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
