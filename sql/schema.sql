-- Source of truth for Google accounts and Pro. Polar/Lemon only write rows here.
-- Apply automatically on first API call, or run once against DATABASE_URL.

CREATE TABLE IF NOT EXISTS gas_users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gas_entitlements (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  google_sub TEXT,
  tier TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gas_entitlements_email_idx
  ON gas_entitlements (lower(email));

CREATE TABLE IF NOT EXISTS gas_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES gas_users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gas_sessions_user_idx ON gas_sessions (user_id);
