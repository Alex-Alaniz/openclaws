import { createHmac, randomBytes } from 'crypto';

const PROXY_SECRET = process.env.PROXY_SIGNING_SECRET?.trim();
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export type ProxyTokenClaims = {
  userId: string;
  scope: string;
  exp: number;
};

/**
 * Issue a signed proxy token for a user.
 * Format: userId.expMs.scope.hmacSignature
 * @param ttlMs Override default TTL (e.g., 30 days for long-lived gateways)
 */
export function issueProxyToken(userId: string, scope: 'anthropic' | 'composio', ttlMs?: number): string {
  const secret = getSecret();
  const exp = Date.now() + (ttlMs ?? TOKEN_TTL_MS);
  const payload = `${userId}.${exp}.${scope}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verify a proxy token and return claims, or null if invalid/expired.
 */
export function verifyProxyToken(token: string): ProxyTokenClaims | null {
  const secret = getSecret();
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [userId, expStr, scope, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Date.now()) return null;

  const payload = `${userId}.${expStr}.${scope}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  // Timing-safe comparison
  if (sig.length !== expected.length) return null;
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return null;

  const { timingSafeEqual } = require('crypto');
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return { userId, scope, exp };
}

function getSecret(): string {
  if (!PROXY_SECRET) {
    throw new Error('PROXY_SIGNING_SECRET must be set');
  }
  return PROXY_SECRET;
}

/**
 * Generate a new signing secret (call once during setup).
 */
export function generateProxySecret(): string {
  return randomBytes(32).toString('hex');
}
