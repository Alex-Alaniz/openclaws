'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: true,
      });
      initialized.current = true;
    }
  }, []);

  return (
    <SessionProvider>
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    </SessionProvider>
  );
}
