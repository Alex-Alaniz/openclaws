import express from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '8080', 10);
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const SETUP_PASSWORD = process.env.SETUP_PASSWORD || '';
const STATE_DIR = process.env.OPENCLAW_STATE_DIR || '/data/state';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SELECTED_MODEL = process.env.SELECTED_MODEL || 'claude-sonnet-4-20250514';

// Ensure state directory exists
mkdirSync(STATE_DIR, { recursive: true });

// --- Provider detection ---

type Provider = 'anthropic' | 'openai';

function detectProvider(): Provider | null {
  if (ANTHROPIC_AUTH_TOKEN || ANTHROPIC_API_KEY) return 'anthropic';
  if (OPENAI_API_KEY) return 'openai';
  return null;
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}

function isOpenAIModel(model: string): boolean {
  return model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3');
}

// --- Auth middleware ---

function requireToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${GATEWAY_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// --- Conversation persistence ---

type Message = { role: 'user' | 'assistant'; content: string };

function getConversationPath(id: string): string {
  return join(STATE_DIR, `conversation-${id.replace(/[^a-zA-Z0-9-]/g, '')}.json`);
}

function loadConversation(id: string): Message[] {
  const path = getConversationPath(id);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Message[];
  } catch {
    return [];
  }
}

function saveConversation(id: string, messages: Message[]): void {
  writeFileSync(getConversationPath(id), JSON.stringify(messages, null, 2));
}

// --- Anthropic chat ---

async function chatAnthropic(messages: Message[], model: string): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  let client: Anthropic;

  if (ANTHROPIC_AUTH_TOKEN) {
    // OAuth token from `claude setup-token`
    client = new Anthropic({
      authToken: ANTHROPIC_AUTH_TOKEN,
      apiKey: null as unknown as string,
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
  } else {
    client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: 'You are OpenClaw, a helpful AI assistant. You have persistent memory across conversations and can help with a wide range of tasks.',
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return { text, usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens } };
}

// --- OpenAI chat ---

async function chatOpenAI(messages: Message[], model: string): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: 'You are OpenClaw, a helpful AI assistant. You have persistent memory across conversations and can help with a wide range of tasks.' },
      ...messages,
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return {
    text,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

// --- Routes ---

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', version: '0.2.0' });
});

// Setup verification (one-time setup check)
app.post('/setup/verify', (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== SETUP_PASSWORD) {
    res.status(403).json({ error: 'Invalid setup password' });
    return;
  }
  res.json({ status: 'verified', message: 'Gateway is configured and ready.' });
});

// Chat endpoint
app.post('/api/chat', requireToken, async (req, res) => {
  const { message, conversationId = 'default', model: requestModel } = req.body as {
    message?: string;
    conversationId?: string;
    model?: string;
  };

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const provider = detectProvider();
  if (!provider) {
    res.status(500).json({ error: 'No AI provider configured. Add an API key in Settings.' });
    return;
  }

  const model = requestModel || SELECTED_MODEL;

  const history = loadConversation(conversationId);
  history.push({ role: 'user', content: message });

  try {
    let result: { text: string; usage: { input_tokens: number; output_tokens: number } };

    // Route to the right provider based on model
    if (isOpenAIModel(model) && OPENAI_API_KEY) {
      result = await chatOpenAI(history, model);
    } else if (isAnthropicModel(model) && (ANTHROPIC_AUTH_TOKEN || ANTHROPIC_API_KEY)) {
      result = await chatAnthropic(history, model);
    } else if (provider === 'openai') {
      result = await chatOpenAI(history, model);
    } else {
      result = await chatAnthropic(history, model);
    }

    history.push({ role: 'assistant', content: result.text });
    saveConversation(conversationId, history);

    res.json({
      message: result.text,
      conversationId,
      model,
      provider,
      usage: result.usage,
    });
  } catch (err) {
    console.error('Chat error:', err);
    history.pop();
    const errorMessage = err instanceof Error ? err.message : 'Chat request failed';
    res.status(500).json({ error: errorMessage });
  }
});

// List conversations
app.get('/api/conversations', requireToken, (_req, res) => {
  const { readdirSync, statSync } = require('fs') as typeof import('fs');
  try {
    const files = readdirSync(STATE_DIR)
      .filter((f: string) => f.startsWith('conversation-') && f.endsWith('.json'))
      .map((f: string) => {
        const id = f.replace('conversation-', '').replace('.json', '');
        const stats = statSync(join(STATE_DIR, f));
        return { id, updatedAt: stats.mtime.toISOString() };
      })
      .sort(
        (a: { updatedAt: string }, b: { updatedAt: string }) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    res.json({ conversations: files });
  } catch {
    res.json({ conversations: [] });
  }
});

// Get conversation history
app.get('/api/conversations/:id', requireToken, (req, res) => {
  const id = String(req.params.id);
  const messages = loadConversation(id);
  res.json({ conversationId: id, messages });
});

// Delete conversation
app.delete('/api/conversations/:id', requireToken, (req, res) => {
  const { unlinkSync } = require('fs') as typeof import('fs');
  const id = String(req.params.id);
  const path = getConversationPath(id);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
  res.json({ deleted: true });
});

// Gateway info
app.get('/api/info', requireToken, (_req, res) => {
  const provider = detectProvider();
  res.json({
    name: 'OpenClaw Gateway',
    version: '0.2.0',
    features: ['chat', 'persistent-memory', 'conversation-management', 'multi-provider'],
    model: SELECTED_MODEL,
    provider,
    hasAnthropicKey: !!ANTHROPIC_API_KEY,
    hasAnthropicOAuth: !!ANTHROPIC_AUTH_TOKEN,
    hasOpenAIKey: !!OPENAI_API_KEY,
  });
});

// --- Start server ---

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenClaw Gateway v0.2.0 listening on port ${PORT}`);
  console.log(`State directory: ${STATE_DIR}`);
  console.log(`Selected model: ${SELECTED_MODEL}`);
  console.log(`Provider: ${detectProvider() ?? 'NONE'}`);
  console.log(`Anthropic API key: ${ANTHROPIC_API_KEY ? 'configured' : 'no'}`);
  console.log(`Anthropic OAuth: ${ANTHROPIC_AUTH_TOKEN ? 'configured' : 'no'}`);
  console.log(`OpenAI API key: ${OPENAI_API_KEY ? 'configured' : 'no'}`);
});
