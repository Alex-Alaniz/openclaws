-- Enable RLS on all user-facing tables
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_exchange_tokens ENABLE ROW LEVEL SECURITY;

-- Helper to bridge NextAuth sessions to RLS
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.set_request_user(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_email, true);
END;
$$;

-- RLS policies using the session config
-- service_role bypasses RLS automatically

CREATE POLICY instances_select_own ON public.instances
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY instances_insert_own ON public.instances
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY instances_update_own ON public.instances
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY instances_delete_own ON public.instances
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));

-- Same for provider_keys
CREATE POLICY provider_keys_select_own ON public.provider_keys
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY provider_keys_insert_own ON public.provider_keys
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY provider_keys_update_own ON public.provider_keys
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY provider_keys_delete_own ON public.provider_keys
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));

-- Same for gateway_exchange_tokens
CREATE POLICY exchange_tokens_select_own ON public.gateway_exchange_tokens
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY exchange_tokens_insert_own ON public.gateway_exchange_tokens
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY exchange_tokens_update_own ON public.gateway_exchange_tokens
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

-- Down migration (commented out)
-- DROP POLICY IF EXISTS exchange_tokens_update_own ON public.gateway_exchange_tokens;
-- DROP POLICY IF EXISTS exchange_tokens_insert_own ON public.gateway_exchange_tokens;
-- DROP POLICY IF EXISTS exchange_tokens_select_own ON public.gateway_exchange_tokens;
-- DROP POLICY IF EXISTS provider_keys_delete_own ON public.provider_keys;
-- DROP POLICY IF EXISTS provider_keys_update_own ON public.provider_keys;
-- DROP POLICY IF EXISTS provider_keys_insert_own ON public.provider_keys;
-- DROP POLICY IF EXISTS provider_keys_select_own ON public.provider_keys;
-- DROP POLICY IF EXISTS instances_delete_own ON public.instances;
-- DROP POLICY IF EXISTS instances_update_own ON public.instances;
-- DROP POLICY IF EXISTS instances_insert_own ON public.instances;
-- DROP POLICY IF EXISTS instances_select_own ON public.instances;
-- ALTER TABLE public.gateway_exchange_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.provider_keys DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.instances DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS app.set_request_user;
-- DROP SCHEMA IF EXISTS app;
