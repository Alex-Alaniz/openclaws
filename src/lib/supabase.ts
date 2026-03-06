import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type InstanceStatus = 'provisioning' | 'running' | 'stopped' | 'error' | 'deleting';

export type AiMode = 'managed' | 'byokey' | 'byoauth';

export type AgentConfig = {
  systemPrompt?: string;
  name?: string;
  personality?: string;
};

export type Instance = {
  id: string;
  user_id: string;
  user_email: string | null;
  fly_app_name: string | null;
  fly_machine_id: string | null;
  fly_volume_id: string | null;
  fly_region: string;
  gateway_url: string | null;
  gateway_token: string | null;
  setup_password: string | null;
  status: InstanceStatus;
  error_message: string | null;
  selected_model: string;
  ai_mode: AiMode;
  agent_config: AgentConfig;
  created_at: string;
  updated_at: string;
};

let supabaseClient: SupabaseClient | null = null;
let userClientCache: Record<string, SupabaseClient> = {};

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signUserJwt(email: string, jwtSecret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes
  const payload = { email, role: 'authenticated', aud: 'authenticated', exp };

  const headerSegment = base64Url(JSON.stringify(header));
  const payloadSegment = base64Url(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

/**
 * Returns a Supabase client scoped to the given user by signing a short-lived JWT
 * with the Supabase JWT secret. The payload sets email + the authenticated role
 * so that RLS policies using user_id/email can evaluate once routes migrate to
 * anon-key access. Currently all routes still use the service_role client, but
 * this provides a safe migration path.
 */
export function getUserSupabase(email: string): SupabaseClient {
  if (userClientCache[email]) return userClientCache[email];

  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();

  if (!url || !anonKey || !jwtSecret) {
    throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_JWT_SECRET must be set');
  }

  const token = signUserJwt(email, jwtSecret);

  const client = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  userClientCache[email] = client;
  return client;
}

export async function getInstanceByUserId(userId: string): Promise<Instance | null> {
  const { data, error } = await getSupabase()
    .from('instances')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch instance: ${error.message}`);
  return data as Instance | null;
}

export async function upsertInstance(
  data: Partial<Instance> & { user_id: string },
): Promise<Instance> {
  const { data: row, error } = await getSupabase()
    .from('instances')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to upsert instance: ${error.message}`);
  return row as Instance;
}

export async function updateInstanceStatus(
  userId: string,
  status: InstanceStatus,
  extra?: Partial<Pick<Instance, 'fly_app_name' | 'fly_machine_id' | 'fly_volume_id' | 'gateway_url' | 'gateway_token' | 'setup_password' | 'error_message'>>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('instances')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update instance status: ${error.message}`);
}

export async function getAgentConfig(userId: string): Promise<AgentConfig | null> {
  const { data, error } = await getSupabase()
    .from('instances')
    .select('agent_config')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return (data?.agent_config as AgentConfig) ?? null;
}

export async function updateAgentConfig(userId: string, config: AgentConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('instances')
    .update({ agent_config: config, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update agent config: ${error.message}`);
}

export async function deleteInstanceByUserId(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('instances')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete instance: ${error.message}`);
}
