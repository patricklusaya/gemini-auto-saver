const { isConfigured, getSql, ensureSchema } = require("./db");

const DEFAULT_LIMIT = 10;

function freePromptLimit() {
  const n = parseInt(process.env.FREE_PROMPTS_LIMIT, 10);
  if (Number.isFinite(n) && n >= 0) return n;
  return DEFAULT_LIMIT;
}

function usageFrom(used) {
  const limit = freePromptLimit();
  const value = Math.max(0, parseInt(used, 10) || 0);
  return {
    freePromptsUsed: value,
    freePromptsLimit: limit,
    freePromptsRemaining: Math.max(0, limit - value)
  };
}

async function readUsage(userId) {
  if (!isConfigured() || !userId) return usageFrom(0);
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT free_prompts_used FROM gas_users WHERE id = ${userId} LIMIT 1`;
  return usageFrom(rows[0] && rows[0].free_prompts_used);
}

async function consumeFreePrompt(userId) {
  if (!isConfigured() || !userId) return { ok: false, ...usageFrom(0) };
  await ensureSchema();
  const sql = getSql();
  const limit = freePromptLimit();
  const rows = await sql`
    UPDATE gas_users
    SET free_prompts_used = free_prompts_used + 1
    WHERE id = ${userId}
      AND free_prompts_used < ${limit}
    RETURNING free_prompts_used
  `;
  if (rows[0]) return { ok: true, ...usageFrom(rows[0].free_prompts_used) };
  return { ok: false, upgrade: true, ...await readUsage(userId) };
}

async function syncFreePrompts(userId, used) {
  if (!isConfigured() || !userId) return usageFrom(used);
  await ensureSchema();
  const sql = getSql();
  const n = Math.max(0, parseInt(used, 10) || 0);
  await sql`
    UPDATE gas_users
    SET free_prompts_used = GREATEST(free_prompts_used, ${n})
    WHERE id = ${userId}
  `;
  return readUsage(userId);
}

module.exports = {
  DEFAULT_LIMIT,
  freePromptLimit,
  usageFrom,
  readUsage,
  consumeFreePrompt,
  syncFreePrompts
};
