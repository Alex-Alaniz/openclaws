CREATE TABLE gateway_exchange_tokens (
  code text PRIMARY KEY,
  instance_id text NOT NULL,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gateway_exchange_tokens_expires_idx ON gateway_exchange_tokens (expires_at);
