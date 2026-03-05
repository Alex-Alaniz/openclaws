'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function BridgeContent() {
  const params = useSearchParams();
  const code = params.get('code') ?? undefined;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redeem() {
      if (!code) {
        setError('Missing exchange code.');
        return;
      }

      try {
        const res = await fetch(`/api/gateway/redeem?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Unable to redeem code.');
          return;
        }

        const data = await res.json() as { gateway_url: string; gateway_token: string };
        if (!data.gateway_url || !data.gateway_token) {
          setError('Invalid gateway response.');
          return;
        }

        // Ensure trailing slash before hash — OpenClaw Control UI expects /#token= format
        const base = data.gateway_url.replace(/\/$/, '');
        window.location.replace(`${base}/#token=${data.gateway_token}`);
      } catch {
        setError('Something went wrong while connecting to your gateway.');
      }
    }

    redeem();
  }, [code]);

  return (
    <div className="max-w-md text-center space-y-4">
      <h1 className="text-2xl font-semibold">Connecting to your gateway…</h1>
      {!error && <p className="text-sm text-gray-300">Please wait while we establish a secure session.</p>}
      {error && (
        <div className="space-y-3">
          <p className="text-sm text-red-300">{error}</p>
          <a
            href="/dashboard/settings"
            className="inline-block rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition"
          >
            Back to settings
          </a>
        </div>
      )}
    </div>
  );
}

export default function GatewayBridgePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <Suspense fallback={<p className="text-sm text-gray-300">Loading…</p>}>
        <BridgeContent />
      </Suspense>
    </div>
  );
}
