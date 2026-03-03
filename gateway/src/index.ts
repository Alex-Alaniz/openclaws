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

// Ensure state directory exists
mkdirSync(STATE_DIR, { recursive: true });

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

// --- Routes ---

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
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
  const { message, conversationId = 'default' } = req.body as {
    message?: string;
    conversationId?: string;
  };

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on gateway' });
    return;
  }

  const history = loadConversation(conversationId);
  history.push({ role: 'user', content: message });

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:
        'You are OpenClaw, a helpful AI assistant. You have persistent memory across conversations and can help with a wide range of tasks.',
      messages: history,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';
    history.push({ role: 'assistant', content: assistantMessage });
    saveConversation(conversationId, history);

    res.json({
      message: assistantMessage,
      conversationId,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    // Remove the failed user message from history
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
  res.json({
    name: 'OpenClaw Gateway',
    version: '0.1.0',
    features: ['chat', 'persistent-memory', 'conversation-management'],
    model: 'claude-sonnet-4-20250514',
  });
});

// --- Start server ---

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenClaw Gateway listening on port ${PORT}`);
  console.log(`State directory: ${STATE_DIR}`);
  console.log(`Anthropic API: ${ANTHROPIC_API_KEY ? 'configured' : 'NOT configured'}`);
});
