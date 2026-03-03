import { getSupabase } from './supabase';

function getEncryptionKey(): string {
  const key = process.env.SUPABASE_ENCRYPTION_KEY;
  if (!key) throw new Error('SUPABASE_ENCRYPTION_KEY is not configured');
  return key;
}

export type AiProvider = 'anthropic' | 'openai' | 'google';
export type KeyType = 'oauth_token' | 'api_key';

export interface AiProviderKeyInfo {
  provider: AiProvider;
  keyType: KeyType;
  keySuffix: string;
  validated: boolean;
  validatedAt: string | null;
  accountInfo: Record<string, unknown>;
  createdAt: string;
}

/**
 * Detect provider and key type from raw key string.
 */
export function detectKeyType(key: string): { provider: AiProvider; keyType: KeyType } | null {
  const trimmed = key.trim();

  // Anthropic setup-token (OAuth — subscription-backed)
  if (trimmed.startsWith('sk-ant-oat01-')) {
    return { provider: 'anthropic', keyType: 'oauth_token' };
  }

  // Anthropic Console API key
  if (trimmed.startsWith('sk-ant-api')) {
    return { provider: 'anthropic', keyType: 'api_key' };
  }

  // OpenAI API key
  if (trimmed.startsWith('sk-') && !trimmed.startsWith('sk-ant-')) {
    return { provider: 'openai', keyType: 'api_key' };
  }

  // Google AI / Gemini (AIza prefix)
  if (trimmed.startsWith('AIza')) {
    return { provider: 'google', keyType: 'api_key' };
  }

  return null;
}

/**
 * Store an encrypted AI provider key for a user via Supabase RPC.
 */
export async function storeProviderKey(
  userId: string,
  rawKey: string,
  provider?: AiProvider,
  keyType?: KeyType,
): Promise<AiProviderKeyInfo> {
  const trimmed = rawKey.trim();
  const detected = detectKeyType(trimmed);
  const resolvedProvider = provider || detected?.provider;
  const resolvedKeyType = keyType || detected?.keyType;

  if (!resolvedProvider || !resolvedKeyType) {
    throw new Error('Could not detect provider from key format. Provide provider and keyType explicitly.');
  }

  const keySuffix = '...' + trimmed.slice(-4);

  const { data, error } = await getSupabase().rpc('store_provider_key', {
    p_user_id: userId,
    p_provider: resolvedProvider,
    p_key_type: resolvedKeyType,
    p_raw_key: trimmed,
    p_passphrase: getEncryptionKey(),
    p_suffix: keySuffix,
  });

  if (error) throw new Error(`Failed to store provider key: ${error.message}`);

  return {
    provider: data.provider,
    keyType: data.key_type,
    keySuffix: data.key_suffix,
    validated: data.validated,
    validatedAt: data.validated_at,
    accountInfo: data.account_info ?? {},
    createdAt: data.created_at,
  };
}

/**
 * Get the decrypted key for a user + provider via Supabase RPC.
 */
export async function getDecryptedKey(
  userId: string,
  provider: AiProvider = 'anthropic',
): Promise<{ key: string; keyType: KeyType } | null> {
  const { data, error } = await getSupabase().rpc('get_decrypted_key', {
    p_user_id: userId,
    p_provider: provider,
    p_passphrase: getEncryptionKey(),
  });

  if (error) throw new Error(`Failed to decrypt key: ${error.message}`);
  if (!data || data.length === 0) return null;

  return {
    key: data[0].decrypted_key,
    keyType: data[0].key_type as KeyType,
  };
}

/**
 * List all provider keys for a user (metadata only — never returns raw keys).
 */
export async function listProviderKeys(userId: string): Promise<AiProviderKeyInfo[]> {
  const { data, error } = await getSupabase()
    .from('ai_provider_keys')
    .select('provider, key_type, key_suffix, validated, validated_at, account_info, created_at')
    .eq('user_id', userId)
    .order('provider');

  if (error) throw new Error(`Failed to list provider keys: ${error.message}`);

  return (data ?? []).map((row) => ({
    provider: row.provider as AiProvider,
    keyType: row.key_type as KeyType,
    keySuffix: row.key_suffix,
    validated: row.validated,
    validatedAt: row.validated_at,
    accountInfo: row.account_info ?? {},
    createdAt: row.created_at,
  }));
}

/**
 * Delete a provider key for a user.
 */
export async function deleteProviderKey(userId: string, provider: AiProvider): Promise<boolean> {
  const { error, count } = await getSupabase()
    .from('ai_provider_keys')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw new Error(`Failed to delete provider key: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Validate a key by making a lightweight API call to the provider.
 */
export async function validateProviderKey(
  userId: string,
  provider: AiProvider,
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
  const keyData = await getDecryptedKey(userId, provider);
  if (!keyData) return { valid: false, error: 'No key found for this provider' };

  try {
    if (provider === 'anthropic') {
      return await validateAnthropicKey(keyData.key, keyData.keyType, userId, provider);
    }
    if (provider === 'openai') {
      return await validateOpenAIKey(keyData.key, userId, provider);
    }
    return { valid: false, error: `Validation not implemented for ${provider}` };
  } catch (err) {
    // Validation failure is returned to caller — no logging needed
    return { valid: false, error: 'Validation request failed' };
  }
}

async function validateAnthropicKey(
  key: string,
  keyType: KeyType,
  userId: string,
  provider: AiProvider,
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
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
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  });

  const accountType = keyType === 'oauth_token' ? 'oauth' : 'api_key';

  if (res.ok || res.status === 429) {
    await markValidated(userId, provider, { type: accountType });
    return { valid: true, accountInfo: { type: accountType } };
  }

  if (res.status === 401) {
    return {
      valid: false,
      error: keyType === 'oauth_token'
        ? 'Token expired or invalid. Run `claude setup-token` again.'
        : 'Invalid API key',
    };
  }

  return { valid: false, error: `Anthropic returned ${res.status}` };
}

async function validateOpenAIKey(
  key: string,
  userId: string,
  provider: AiProvider,
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (res.ok) {
    await markValidated(userId, provider, { type: 'api_key' });
    return { valid: true, accountInfo: { type: 'api_key' } };
  }

  if (res.status === 401) return { valid: false, error: 'Invalid API key' };
  return { valid: false, error: `OpenAI returned ${res.status}` };
}

async function markValidated(userId: string, provider: string, accountInfo: Record<string, unknown>) {
  await getSupabase()
    .from('ai_provider_keys')
    .update({
      validated: true,
      validated_at: new Date().toISOString(),
      account_info: accountInfo,
    })
    .eq('user_id', userId)
    .eq('provider', provider);
}
