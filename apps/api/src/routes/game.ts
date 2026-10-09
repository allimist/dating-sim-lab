import type { FastifyInstance } from 'fastify';
import { newGame, nextDay, apologize, score, defs, type GameState } from '@dsl/engine';
import { tx, type Client } from '../db';
import { HttpError, lockLatestGame, loadGame, insertGame, saveGame, activeConversation } from '../store';
import { gameView, profileView } from '../views';
import { randomInt } from 'node:crypto';

/** Records the final score once, when a game ends. */
export async function recordScore(c: Client, gameId: number, playerId: number, s: GameState) {
  if (s.status !== 'over') return;
  const sc = score(s);
  await c.query(
    `INSERT INTO scores (player_id, game_id, score, crushes, likes, cast_size, perfect, day) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (game_id) DO NOTHING`,
    [playerId, gameId, sc.total, sc.crushes, sc.likes, s.castSize, s.perfect, s.day],
  );
}

export async function gameRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] };

  app.get('/api/game', auth, async (req: any) => {
    return tx(async c => {
      const g = await c.query(`SELECT id FROM games WHERE player_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`, [req.user.id]);
      if (!g.rowCount) return { game: null };
      const { row, state } = await loadGame(c, g.rows[0].id);
      const active = await activeConversation(c, row.id);
      return { game: gameView(row.id, state, { activeConversationId: active?.id ?? null, lastSummary: row.last_summary }) };
    });
  });

  app.post('/api/game/new', auth, async (req: any) => {
    const castSize = Math.max(1, Math.min(100, Number(req.body?.castSize) || 5));
    return tx(async c => {
      const state = newGame(randomInt(1, 2 ** 31), { castSize });
      const id = await insertGame(c, req.user.id, state);
      return { game: gameView(id, state) };
    });
  });

  app.post('/api/game/day/next', auth, async (req: any) => {
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      if (await activeConversation(c, row.id)) throw new HttpError(409, 'conversation_active', 'Finish your conversation first.');
      const { state: next, summary } = nextDay(state);
      const names = defs(next);
      const summaryView = {
        ...summary,
        entries: summary.entries.map(e => ({ ...e, name: names.get(e.girlId)!.name, change: e.to - e.from })),
      };
      await saveGame(c, row.id, next, summaryView);
      await recordScore(c, row.id, row.player_id, next);
      return { summary: summaryView, game: gameView(row.id, next, { lastSummary: summaryView }) };
    });
  });

  app.get('/api/missions', auth, async (req: any) => {
    return tx(async c => {
      const { state } = await lockLatestGame(c, req.user.id);
      return { missions: state.missions };
    });
  });

  app.get('/api/girls/:id', auth, async (req: any) => {
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      if (!state.girls.some(g => g.id === req.params.id)) throw new HttpError(404, 'no_girl', 'Unknown girl.');
      const h = await c.query(
        `SELECT c.day, c.total, c.status, json_agg(json_build_object('her', t.her_lines, 'me', t.option_text, 'style', t.style, 'reaction', t.reaction, 'delta', t.delta) ORDER BY t.turn) AS turns
         FROM conversations c JOIN conversation_turns t ON t.conversation_id = c.id
         WHERE c.game_id = $1 AND c.girl_id = $2 GROUP BY c.id ORDER BY c.id DESC LIMIT 5`,
        [row.id, req.params.id],
      );
      return { girl: profileView(state, req.params.id, h.rows) };
    });
  });

  app.post('/api/girls/:id/apologize', auth, async (req: any) => {
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      if (!state.girls.some(g => g.id === req.params.id)) throw new HttpError(404, 'no_girl', 'Unknown girl.');
      const { state: next, accepted, line } = apologize(state, req.params.id);
      await saveGame(c, row.id, next);
      return { accepted, line, game: gameView(row.id, next) };
    });
  });
}
