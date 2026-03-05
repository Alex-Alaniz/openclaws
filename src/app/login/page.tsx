'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { trackLoginStarted } from '@/lib/analytics';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84A10.99 10.99 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.11A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.43.34-2.11L2.18 7.07A10.99 10.99 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.82z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] px-6 py-10 text-white font-sans">
      <div className="w-full max-w-[440px] rounded-[32px] border border-white/[0.08] bg-[#0F0F0F] p-12 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
        <div className="mb-10 flex items-center justify-center gap-4 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/15 bg-white/[0.05]">
            <img src="/openclaw.svg" alt="OpenClaws" className="h-7 w-7" />
          </div>
          <div className="text-left">
            <p className="text-[22px] font-bold tracking-tight text-white leading-none">OpenClaws</p>
            <a href="https://bearified.co" target="_blank" rel="noopener noreferrer" className="mt-1 block text-[11px] font-bold tracking-wide text-zinc-500 uppercase hover:text-zinc-400">by Bearified</a>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[32px] font-bold tracking-tight text-white">Sign in</h1>
          <p className="mt-2 text-[15px] font-medium text-zinc-500">to continue to OpenClaws</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => { trackLoginStarted('google'); signIn('google', { callbackUrl: '/dashboard' }); }}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] bg-white px-4 text-[15px] font-bold text-black transition-all hover:bg-zinc-100 hover:scale-[1.01] active:scale-[0.99]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            onClick={() => { trackLoginStarted('twitter'); signIn('twitter', { callbackUrl: '/dashboard' }); }}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 text-[15px] font-bold text-white transition-all hover:bg-white/[0.08] hover:scale-[1.01] active:scale-[0.99]"
          >
            <XIcon />
            Continue with X
          </button>

          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0F0F0F] px-4 text-[10px] font-bold tracking-[0.2em] text-zinc-600 uppercase">DEV ONLY</span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-[52px] w-full rounded-[14px] border border-white/[0.08] bg-black/40 px-4 text-[15px] text-white outline-none ring-0 placeholder:text-zinc-600 transition-colors focus:border-white/20"
                />

                <button
                  type="button"
                  onClick={() => signIn('credentials', { email, callbackUrl: '/dashboard' })}
                  className="h-[52px] w-full rounded-[14px] border border-white/[0.12] bg-white/[0.05] px-4 text-[15px] font-bold text-white transition-all hover:bg-white/[0.1] active:scale-[0.99]"
                >
                  Continue with email
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[13px] font-medium text-zinc-600">
          Signing in automatically creates your account
        </p>
      </div>
    </div>
  );
}
