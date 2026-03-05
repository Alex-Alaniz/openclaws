import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event) {
    // Scrub any API key patterns from error messages
    if (event.message) {
      event.message = event.message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED]');
      event.message = event.message.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
      event.message = event.message.replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED]');
    }
    return event;
  },
});
