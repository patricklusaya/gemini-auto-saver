const crypto = require("crypto");

let client = null;
let schemaReady = false;

function databaseUrl() {
  return String(process.env.DATABASE_URL || "").trim();
}

function isConfigured() {
  return !!databaseUrl();
}

function getSql() {
  if (!isConfigured()) return null;
  if (client) return client;
  const { neon } = require("@neondatabase/serverless");
  client = neon(databaseUrl());
  return client;
}

async function ensureSchema() {
  const sql = getSql();
  if (!sql) return false;
  if (schemaReady) return true;
  await sql`
    CREATE TABLE IF NOT EXISTS gas_users (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS gas_entitlements_email_idx ON gas_entitlements (lower(email))`;
  await sql`
    CREATE TABLE IF NOT EXISTS gas_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES gas_users (id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS gas_sessions_user_idx ON gas_sessions (user_id)`;
  schemaReady = true;
  return true;
}

function newId() {
  return crypto.randomUUID();
}

module.exports = { isConfigured, getSql, ensureSchema, newId };
