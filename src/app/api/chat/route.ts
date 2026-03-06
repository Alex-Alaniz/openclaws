import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getInstanceByUserId } from '@/lib/supabase';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session?.user || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`${email}:/api/chat`, 30, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const instance = await getInstanceByUserId(email);
  if (!instance || instance.status !== 'running' || !instance.gateway_url || !instance.gateway_token) {
    return NextResponse.json({ error: 'No running gateway instance' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { message?: string; sessionKey?: string };
  if (!body.message || typeof body.message !== 'string' || body.message.length > 32_000) {
    return NextResponse.json({ error: 'message is required and must be under 32000 characters' }, { status: 400 });
  }

  try {
    const reply = await sendViaGateway(instance.gateway_url, instance.gateway_token, body.message, body.sessionKey);
    return NextResponse.json({ message: reply });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    // If gateway WebSocket fails, fall back to direct Anthropic call
    if (errMsg.includes('GATEWAY_') || errMsg.includes('WebSocket') || errMsg.includes('timeout') || errMsg.includes('connect')) {
      return await callAnthropicDirect(body.message);
    }

    Sentry.captureException(err);
    return NextResponse.json({ error: 'Failed to reach gateway' }, { status: 502 });
  }
}

function sendViaGateway(gatewayUrl: string, token: string, message: string, sessionKey?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wsUrl = gatewayUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(wsUrl);
    const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    let chatStream = '';
    let resolved = false;
    const idempotencyKey = randomUUID();

    const cleanup = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        // Return whatever we've streamed so far, or reject
        if (chatStream.trim()) {
          resolve(chatStream);
        } else {
          reject(new Error('GATEWAY_timeout'));
        }
      }
    }, 55_000);

    const sendRequest = (method: string, params: unknown): Promise<unknown> => {
      const id = randomUUID();
      const msg = { type: 'req', id, method, params };
      ws.send(JSON.stringify(msg));
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
      });
    };

    ws.on('open', () => {
      // Wait for connect.challenge event before sending connect request
    });

    ws.on('message', async (data: WebSocket.Data) => {
      if (resolved) return;

      let msg: {
        type: string;
        id?: string;
        event?: string;
        payload?: Record<string, unknown>;
        ok?: boolean;
        error?: { code?: string; message?: string };
        [key: string]: unknown;
      };
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }

      // Handle response to our requests
      if (msg.type === 'res' && msg.id) {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          if (msg.ok) {
            p.resolve(msg.payload);
          } else {
            p.reject(new Error(msg.error?.message ?? 'request failed'));
          }
        }
        return;
      }

      // Handle events
      if (msg.type === 'event') {
        const event = msg.event;
        const payload = msg.payload as Record<string, unknown> | undefined;

        // connect.challenge — respond with connect request
        if (event === 'connect.challenge') {
          const nonce = (payload as { nonce?: string })?.nonce ?? '';
          try {
            await sendRequest('connect', {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'openclaws-dashboard',
                version: '1.0.0',
                platform: 'server',
                mode: 'backend',
                instanceId: randomUUID(),
              },
              role: 'operator',
              scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
              device: null,
              caps: [],
              auth: { token, password: undefined },
              userAgent: 'OpenClaws Dashboard/1.0',
              locale: 'en',
            });

            // Connected! Now send the chat message
            await sendRequest('chat.send', {
              sessionKey: sessionKey || 'agent:main:main',
              message,
              deliver: false,
              idempotencyKey,
            });
          } catch (err) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              cleanup();
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }
          return;
        }

        // Chat events — collect the streamed response
        if (event === 'chat') {
          const state = (payload as { state?: string })?.state;
          const chatMsg = payload?.message as Record<string, unknown> | undefined;

          if (state === 'delta') {
            // Extract text from delta message
            const text = extractText(chatMsg);
            if (text && text.length > chatStream.length) {
              chatStream = text;
            }
          } else if (state === 'final' || state === 'aborted') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              const finalText = extractText(chatMsg) || chatStream;
              cleanup();
              resolve(finalText.trim() || '(No response)');
            }
          }
        }

        return;
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`GATEWAY_WebSocket error: ${err.message}`));
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (chatStream.trim()) {
          resolve(chatStream);
        } else {
          reject(new Error('GATEWAY_connection closed'));
        }
      }
    });
  });
}

function extractText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as Record<string, unknown>;

  // Direct text content
  if (typeof m.text === 'string') return m.text;

  // Content array format: [{type: "text", text: "..."}]
  if (Array.isArray(m.content)) {
    return m.content
      .filter((c: unknown) => typeof c === 'object' && c !== null && (c as Record<string, unknown>).type === 'text')
      .map((c: unknown) => (c as Record<string, unknown>).text ?? '')
      .join('');
  }

  // Role + content string
  if (typeof m.content === 'string') return m.content;

  return '';
}

async function callAnthropicDirect(message: string): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Chat service temporarily unavailable' }, { status: 503 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI request failed. Please try again.' }, { status: 502 });
    }

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c: { type: string; text?: string }) => c.type === 'text')?.text ?? '';
    return NextResponse.json({ message: text });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'AI request failed. Please try again.' }, { status: 502 });
  }
}
