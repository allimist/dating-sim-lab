import type { FastifyInstance } from 'fastify';
import { startConversation, reply } from '@dsl/engine';
import { tx } from '../db';
import { HttpError, lockLatestGame, saveGame, activeConversation } from '../store';
import { conversationView, gameView } from '../views';
import { recordScore } from './game';

export async function conversationRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] };

  app.post('/api/conversations', auth, async (req: any) => {
    const girlId = String(req.body?.girlId ?? '');
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      const open = await activeConversation(c, row.id);
      if (open) {
        if (open.convo.girlId === girlId) return { conversation: conversationView(open.id, state, open.convo), game: gameView(row.id, state, { activeConversationId: open.id }) };
        throw new HttpError(409, 'conversation_active', 'Finish your current conversation first.');
      }
      if (!state.girls.some(g => g.id === girlId)) throw new HttpError(404, 'no_girl', 'Unknown girl.');
      const { state: next, convo } = startConversation(state, girlId);
      const ins = await c.query(
        `INSERT INTO conversations (game_id, girl_id, day, status, total, state) VALUES ($1,$2,$3,'active',0,$4) RETURNING id`,
        [row.id, girlId, convo.day, JSON.stringify(convo)],
      );
      await saveGame(c, row.id, next);
      const id = ins.rows[0].id;
      return { conversation: conversationView(id, next, convo), game: gameView(row.id, next, { activeConversationId: id }) };
    });
  });

  app.get('/api/conversations/active', auth, async (req: any) => {
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      const open = await activeConversation(c, row.id);
      return { conversation: open ? conversationView(open.id, state, open.convo) : null };
    });
  });

  app.post('/api/conversations/:id/reply', auth, async (req: any) => {
    const id = Number(req.params.id);
    const optionId = String(req.body?.optionId ?? '');
    return tx(async c => {
      const { row, state } = await lockLatestGame(c, req.user.id);
      const open = await activeConversation(c, row.id);
      if (!open || open.id !== id) throw new HttpError(409, 'not_active', 'This conversation is not active.');
      const out = reply(state, open.convo, optionId);
      const turn = out.convo.log.at(-1)!;
      await c.query(
        `INSERT INTO conversation_turns (conversation_id, turn, kind, her_lines, option_text, style, delta, outcome, reaction)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, turn.turn, turn.kind, JSON.stringify(turn.herLines), turn.option.text, turn.option.style, turn.delta, turn.outcome, turn.reaction],
      );
      await c.query(
        `UPDATE conversations SET state=$2, status=$3, total=$4, ended_at = CASE WHEN $3 = 'ended' THEN now() ELSE NULL END WHERE id=$1`,
        [id, JSON.stringify(out.convo), out.convo.status, out.convo.total],
      );
      await saveGame(c, row.id, out.state);
      await recordScore(c, row.id, row.player_id, out.state);
      return {
        result: out.result,
        conversation: conversationView(id, out.state, out.convo),
        game: gameView(row.id, out.state, { activeConversationId: out.convo.status === 'active' ? id : null, lastSummary: row.last_summary }),
      };
    });
  });
}
