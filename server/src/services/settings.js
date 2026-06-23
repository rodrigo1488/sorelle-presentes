import pool from '../config/db.js';

export async function getSetting(key) {
  const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_date)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_date = NOW()`,
    [key, value]
  );
}

export function maskToken(token) {
  if (!token || token.length < 8) return token ? '••••••••' : '';
  return `${'•'.repeat(Math.min(token.length - 4, 12))}${token.slice(-4)}`;
}
