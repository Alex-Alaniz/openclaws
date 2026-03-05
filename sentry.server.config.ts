import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
  beforeBreadcrumb(breadcrumb) {
    // Strip API keys from outbound fetch breadcrumbs to provider APIs
    if (breadcrumb.category === 'http' || breadcrumb.category === 'fetch') {
      const url = breadcrumb.data?.url ?? '';
      if (url.includes('api.anthropic.com') || url.includes('api.openai.com')) {
        if (breadcrumb.data) {
          delete breadcrumb.data['request_headers'];
          delete breadcrumb.data['headers'];
        }
      }
    }
    return breadcrumb;
  },
});
