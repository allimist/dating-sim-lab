import type { FastifyInstance } from 'fastify';
import { pool } from '../db';

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard', async () => {
    const r = await pool.query(
      `SELECT s.score, s.crushes, s.likes, s.cast_size, s.perfect, s.day, s.created_at, p.name
       FROM scores s JOIN players p ON p.id = s.player_id
       ORDER BY s.score DESC, s.created_at ASC LIMIT 20`,
    );
    return { scores: r.rows };
  });
}
