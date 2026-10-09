import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://dating:dating@localhost:5437/dating',
  max: 10,
});

export type Client = pg.PoolClient;

/** Runs `fn` in a transaction; rolls back on any error. */
export async function tx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Applies the schema, retrying while PostgreSQL is still starting. */
export async function migrate(schemaPath: string) {
  const sql = await readFile(schemaPath, 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(sql);
      return;
    } catch (e) {
      if (attempt >= 30) throw e;
      console.log(`waiting for PostgreSQL (${(e as Error).message})…`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const DEMO_ACCOUNTS = [
  { email: 'demo@example.com', name: 'Alex', password: 'demo123' },
  { email: 'guest@example.com', name: 'Guest', password: 'guest123' },
];

export async function seedDemoAccounts() {
  for (const a of DEMO_ACCOUNTS) {
    await pool.query(
      `INSERT INTO players (email, name, password_hash, demo_password) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      [a.email, a.name, hashPassword(a.password), a.password],
    );
  }
}
