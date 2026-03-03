'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mb-6 text-sm text-zinc-400">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-[#DC2626] px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
