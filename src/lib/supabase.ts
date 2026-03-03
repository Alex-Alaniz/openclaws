import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type InstanceStatus = 'provisioning' | 'running' | 'stopped' | 'error' | 'deleting';

export type AiMode = 'managed' | 'byokey' | 'byoauth';

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
  created_at: string;
  updated_at: string;
};

let supabaseClient: SupabaseClient | null = null;

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

export async function deleteInstanceByUserId(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('instances')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete instance: ${error.message}`);
}
