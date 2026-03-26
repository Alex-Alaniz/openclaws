import * as Sentry from '@sentry/nextjs';

const EXTENSION_PROTOCOLS = [
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'safari-web-extension://',
] as const;

const NOISY_UNDEFINED_PROPERTY_ERRORS = [
  "Cannot read properties of undefined (reading 'addListener')",
  "Cannot read properties of undefined (reading 'emit')",
] as const;

type EventLike = {
  message?: string;
  request?: { url?: string | null };
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          filename?: string;
        }>;
      };
    }>;
  };
};

type EventHintLike = {
  originalException?: unknown;
};

function getExceptionMessages(exception?: EventLike['exception']): string[] {
  return exception?.values?.flatMap((value) => [value.type, value.value].filter(Boolean) as string[]) ?? [];
}

function getEventFrameFilenames(event: EventLike): string[] {
  return (
    event.exception?.values?.flatMap((value) =>
      value.stacktrace?.frames?.map((frame) => frame.filename).filter((filename): filename is string => Boolean(filename)) ?? []
    ) ?? []
  );
}

function isExtensionUrl(value: string | null | undefined): boolean {
  return Boolean(value && EXTENSION_PROTOCOLS.some((protocol) => value.startsWith(protocol)));
}

function hasAppFrame(filenames: string[]): boolean {
  return filenames.some((filename) =>
    filename.startsWith('/') || filename.includes('/_next/') || filename.startsWith('http://') || filename.startsWith('https://')
  );
}

function isKnownExtensionNoise(event: EventLike, hint: EventHintLike): boolean {
  const messages = [event.message, ...getExceptionMessages(event.exception)].filter(Boolean) as string[];
  const isNoisyUndefinedPropertyError = messages.some((message) =>
    NOISY_UNDEFINED_PROPERTY_ERRORS.some((knownMessage) => message.includes(knownMessage))
  );

  if (!isNoisyUndefinedPropertyError) {
    return false;
  }

  const frameFilenames = getEventFrameFilenames(event);
  const originalExceptionMessage =
    hint.originalException instanceof Error ? hint.originalException.message : String(hint.originalException ?? '');

  const hasExtensionFrame = frameFilenames.some((filename) => isExtensionUrl(filename));
  const requestIsExtensionUrl = isExtensionUrl(event.request?.url);
  const exceptionLooksExtensionRelated = EXTENSION_PROTOCOLS.some((protocol) => originalExceptionMessage.includes(protocol));

  if (hasExtensionFrame || requestIsExtensionUrl || exceptionLooksExtensionRelated) {
    return true;
  }

  return frameFilenames.length > 0 && !hasAppFrame(frameFilenames);
}

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
  beforeSend(event, hint) {
    if (isKnownExtensionNoise(event, hint ?? {})) {
      return null;
    }

    // Scrub any API key patterns from error messages
    if (event.message) {
      event.message = event.message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED]');
      event.message = event.message.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
      event.message = event.message.replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED]');
    }
    return event;
  },
});
