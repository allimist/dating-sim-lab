import type { FastifyInstance } from 'fastify';
import { pool, hashPassword, checkPassword, DEMO_ACCOUNTS } from '../db';
import { HttpError } from '../store';

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/demo-accounts', async () => DEMO_ACCOUNTS.map(({ email, name, password }) => ({ email, name, password })));

  app.post('/api/auth/register', async (req: any) => {
    const { email, name, password } = req.body ?? {};
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'bad_email', 'Enter a valid email.');
    if (typeof name !== 'string' || name.trim().length < 2) throw new HttpError(400, 'bad_name', 'Name must be at least 2 characters.');
    if (typeof password !== 'string' || password.length < 6) throw new HttpError(400, 'bad_password', 'Password must be at least 6 characters.');
    const r = await pool.query(
      `INSERT INTO players (email, name, password_hash) VALUES (lower($1), $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, email, name`,
      [email.trim(), name.trim().slice(0, 40), hashPassword(password)],
    );
    if (!r.rowCount) throw new HttpError(409, 'email_taken', 'That email is already registered.');
    const u = r.rows[0];
    return { token: app.jwt.sign({ id: u.id }), user: u };
  });

  app.post('/api/auth/login', async (req: any) => {
    const { email, password } = req.body ?? {};
    const r = await pool.query(`SELECT id, email, name, password_hash FROM players WHERE email = lower($1)`, [String(email ?? '').trim()]);
    const u = r.rows[0];
    if (!u || !checkPassword(String(password ?? ''), u.password_hash)) throw new HttpError(401, 'bad_login', 'Wrong email or password.');
    return { token: app.jwt.sign({ id: u.id }), user: { id: u.id, email: u.email, name: u.name } };
  });

  app.get('/api/me', { onRequest: [app.authenticate] }, async (req: any) => {
    const r = await pool.query(`SELECT id, email, name FROM players WHERE id = $1`, [req.user.id]);
    if (!r.rowCount) throw new HttpError(401, 'unknown_user', 'Please log in again.');
    return r.rows[0];
  });
}
