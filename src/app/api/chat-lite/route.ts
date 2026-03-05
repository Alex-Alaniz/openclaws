import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions, getUserEmail } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { listProviderKeys, getDecryptedKey, type AiProvider, type KeyType } from '@/lib/provider-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODELS = new Set([
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-sonnet-4-6-20260301',
  'claude-opus-4-6-20260301',
  'claude-haiku-4-5-20251001',
]);

const OPENAI_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-5.3',
]);

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = getUserEmail(session ?? {});
  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Tighter rate limit for free tier: 10 messages per minute
  const rl = await rateLimit(`${email}:/api/chat-lite`, 10, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({})) as {
    message?: string;
    messages?: ChatMessage[];
    model?: string;
  };

  // Support both single message and conversation history
  let messages: ChatMessage[];
  if (body.messages && Array.isArray(body.messages)) {
    messages = body.messages;
  } else if (body.message && typeof body.message === 'string') {
    messages = [{ role: 'user', content: body.message }];
  } else {
    return NextResponse.json({ error: 'message or messages required' }, { status: 400 });
  }

  // Validate message structure
  const isValid = messages.length > 0 && messages.every(
    m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  );
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
  }

  // Validate message length
  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalLength > 100_000) {
    return NextResponse.json({ error: 'Total message length exceeds limit' }, { status: 400 });
  }

  // Get user's provider keys
  let keys;
  try {
    keys = await listProviderKeys(email);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Failed to load API keys' }, { status: 500 });
  }

  // Only Anthropic and OpenAI are supported for chat-lite
  const supportedKeys = keys.filter(k => k.provider === 'anthropic' || k.provider === 'openai');
  if (supportedKeys.length === 0) {
    return NextResponse.json({
      error: 'No API key configured. Add your Anthropic or OpenAI key in Settings to use BYO Key Chat.',
    }, { status: 400 });
  }

  // Determine which provider to use
  const requestedModel = body.model;
  let provider: AiProvider;
  let model: string;

  if (requestedModel) {
    if (ANTHROPIC_MODELS.has(requestedModel)) {
      provider = 'anthropic';
      model = requestedModel;
    } else if (OPENAI_MODELS.has(requestedModel)) {
      provider = 'openai';
      model = requestedModel;
    } else {
      return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
    }
  } else {
    // Default: use Anthropic if available, else OpenAI
    const hasAnthropic = supportedKeys.some(k => k.provider === 'anthropic');
    const hasOpenai = supportedKeys.some(k => k.provider === 'openai');
    if (hasAnthropic) {
      provider = 'anthropic';
      model = 'claude-sonnet-4-20250514';
    } else if (hasOpenai) {
      provider = 'openai';
      model = 'gpt-4o';
    } else {
      return NextResponse.json({ error: 'No supported API key found' }, { status: 400 });
    }
  }

  // Check if user has a key for the selected provider
  if (!supportedKeys.some(k => k.provider === provider)) {
    return NextResponse.json({
      error: `No ${provider} API key found. Add one in Settings.`,
    }, { status: 400 });
  }

  // Decrypt the key
  let decrypted: { key: string; keyType: KeyType } | null;
  try {
    decrypted = await getDecryptedKey(email, provider);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 });
  }

  if (!decrypted) {
    return NextResponse.json({ error: 'API key not found' }, { status: 400 });
  }

  // Call the appropriate provider
  try {
    if (provider === 'anthropic') {
      return await callAnthropic(decrypted.key, decrypted.keyType, model, messages);
    } else {
      return await callOpenAI(decrypted.key, model, messages);
    }
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'AI provider request failed' }, { status: 502 });
  }
}

async function callAnthropic(
  key: string,
  keyType: string,
  model: string,
  messages: ChatMessage[],
): Promise<NextResponse> {
  const headers: Record<string, string> = {
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };

  if (keyType === 'oauth_token') {
    headers['Authorization'] = `Bearer ${key}`;
    headers['anthropic-beta'] = 'oauth-2025-04-20';
  } else {
    headers['x-api-key'] = key;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: 'API key expired or invalid. Update your key in Settings.' }, { status: 401 });
    }
    if (res.status === 403) {
      return NextResponse.json({ error: `Your API key does not have access to ${model}. Check your Anthropic account permissions.` }, { status: 403 });
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limited by Anthropic. Please wait a moment.' }, { status: 429 });
    }
    if (res.status === 402) {
      return NextResponse.json({ error: 'Your Anthropic account has insufficient credits.' }, { status: 402 });
    }
    return NextResponse.json({ error: 'Anthropic request failed. Please try again.' }, { status: 502 });
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find(c => c.type === 'text')?.text;
  if (!text) {
    return NextResponse.json({ message: '', model, provider: 'anthropic' });
  }
  return NextResponse.json({ message: text, model, provider: 'anthropic' });
}

async function callOpenAI(
  key: string,
  model: string,
  messages: ChatMessage[],
): Promise<NextResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: 'API key invalid. Update your key in Settings.' }, { status: 401 });
    }
    if (res.status === 403) {
      return NextResponse.json({ error: `Your API key does not have access to ${model}. Check your OpenAI account permissions.` }, { status: 403 });
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limited by OpenAI. Please wait a moment.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'OpenAI request failed. Please try again.' }, { status: 502 });
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  return NextResponse.json({ message: text, model, provider: 'openai' });
}
