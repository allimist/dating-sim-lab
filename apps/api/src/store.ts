/**
 * Maps the engine's GameState to PostgreSQL rows and back.
 * Every write happens inside a transaction that first locks the game row,
 * so two tabs clicking at once cannot corrupt a game.
 */
import { defs, type Conversation, type GameState, type GirlState, type Mission } from '@dsl/engine';
import type { Mood, PlayerFactKey } from '@dsl/content';
import type { Client } from './db';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface GameRow {
  id: number;
  player_id: number;
  last_summary: unknown;
}

/** Locks and loads the player's latest game. */
export async function lockLatestGame(c: Client, playerId: number): Promise<{ row: GameRow; state: GameState }> {
  const g = await c.query(`SELECT id FROM games WHERE player_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`, [playerId]);
  if (!g.rowCount) throw new HttpError(404, 'no_game', 'Start a new game first.');
  return loadGame(c, g.rows[0].id, true);
}

export async function loadGame(c: Client, gameId: number, lock = false): Promise<{ row: GameRow; state: GameState }> {
  const g = await c.query(`SELECT * FROM games WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [gameId]);
  if (!g.rowCount) throw new HttpError(404, 'no_game', 'Game not found.');
  const row = g.rows[0];
  const girls = await c.query(`SELECT * FROM girl_states WHERE game_id = $1`, [gameId]);
  const memories = await c.query(`SELECT girl_id, kind, key, value, day FROM girl_memories WHERE game_id = $1`, [gameId]);
  const missions = await c.query(`SELECT * FROM missions WHERE game_id = $1 ORDER BY issued_day, id`, [gameId]);

  const byGirl = new Map<string, GirlState>();
  for (const r of girls.rows) {
    byGirl.set(r.girl_id, {
      id: r.girl_id, affinity: r.affinity, mood: r.mood as Mood, blocked: r.blocked, blockedSinceDay: r.blocked_since_day,
      apologyDay: r.apology_day, careful: r.careful, lastTalkedDay: r.last_talked_day, talkedToday: r.talked_today,
      dayStartAffinity: r.day_start_affinity, conversations: r.conversations, recentLines: r.recent_lines,
      memory: { heToldMe: {}, iToldHim: {} },
    });
  }
  // Each memory row goes into its own girl's memory, never anyone else's.
  for (const m of memories.rows) {
    const girl = byGirl.get(m.girl_id);
    if (!girl) continue;
    if (m.kind === 'he_told_me') girl.memory.heToldMe[m.key as PlayerFactKey] = { value: m.value, day: m.day };
    else girl.memory.iToldHim[m.key] = { value: m.value, day: m.day };
  }

  const castOrder = [...defs({ castSize: row.cast_size }).keys()];
  const state: GameState = {
    seed: Number(row.seed), day: row.day, maxDays: row.max_days, energy: row.energy, energyPerDay: row.energy_per_day,
    castSize: row.cast_size, missionPoints: row.mission_points, nextMissionNo: row.next_mission_no, status: row.status,
    perfect: row.perfect,
    girls: [...byGirl.values()].sort((a, b) => castOrder.indexOf(a.id) - castOrder.indexOf(b.id)),
    missions: missions.rows.map((m): Mission => ({
      id: m.id, type: m.type, girlId: m.girl_id, title: m.title, description: m.description, issuedDay: m.issued_day,
      deadlineDay: m.deadline_day, reward: m.reward, energyReward: m.energy_reward, target: m.target, status: m.status,
    })),
  };
  return { row: { id: row.id, player_id: row.player_id, last_summary: row.last_summary }, state };
}

export async function insertGame(c: Client, playerId: number, s: GameState): Promise<number> {
  const r = await c.query(
    `INSERT INTO games (player_id, seed, cast_size, day, max_days, energy, energy_per_day, mission_points, next_mission_no, status, perfect)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [playerId, s.seed, s.castSize, s.day, s.maxDays, s.energy, s.energyPerDay, s.missionPoints, s.nextMissionNo, s.status, s.perfect],
  );
  const id = r.rows[0].id;
  await saveGame(c, id, s);
  return id;
}

/** Writes the whole state back (upserts). Memories are only ever added or updated per girl. */
export async function saveGame(c: Client, gameId: number, s: GameState, lastSummary?: unknown) {
  await c.query(
    `UPDATE games SET day=$2, energy=$3, mission_points=$4, next_mission_no=$5, status=$6, perfect=$7, updated_at=now(),
       finished_at = CASE WHEN $6 = 'over' AND finished_at IS NULL THEN now() ELSE finished_at END,
       last_summary = COALESCE($8::jsonb, last_summary)
     WHERE id=$1`,
    [gameId, s.day, s.energy, s.missionPoints, s.nextMissionNo, s.status, s.perfect, lastSummary === undefined ? null : JSON.stringify(lastSummary)],
  );
  for (const g of s.girls) {
    await c.query(
      `INSERT INTO girl_states (game_id, girl_id, affinity, mood, blocked, blocked_since_day, apology_day, careful, last_talked_day, talked_today, day_start_affinity, conversations, recent_lines)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (game_id, girl_id) DO UPDATE SET affinity=EXCLUDED.affinity, mood=EXCLUDED.mood, blocked=EXCLUDED.blocked,
         blocked_since_day=EXCLUDED.blocked_since_day, apology_day=EXCLUDED.apology_day, careful=EXCLUDED.careful,
         last_talked_day=EXCLUDED.last_talked_day, talked_today=EXCLUDED.talked_today, day_start_affinity=EXCLUDED.day_start_affinity,
         conversations=EXCLUDED.conversations, recent_lines=EXCLUDED.recent_lines`,
      [gameId, g.id, g.affinity, g.mood, g.blocked, g.blockedSinceDay, g.apologyDay, g.careful, g.lastTalkedDay, g.talkedToday, g.dayStartAffinity, g.conversations, JSON.stringify(g.recentLines)],
    );
    const rows: [string, string, string, number][] = [
      ...Object.entries(g.memory.heToldMe).map(([k, e]) => ['he_told_me', k, e!.value, e!.day] as [string, string, string, number]),
      ...Object.entries(g.memory.iToldHim).map(([k, e]) => ['i_told_him', k, e.value, e.day] as [string, string, string, number]),
    ];
    for (const [kind, key, value, day] of rows) {
      await c.query(
        `INSERT INTO girl_memories (game_id, girl_id, kind, key, value, day) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (game_id, girl_id, kind, key) DO UPDATE SET value=EXCLUDED.value, day=EXCLUDED.day
         WHERE girl_memories.value IS DISTINCT FROM EXCLUDED.value`,
        [gameId, g.id, kind, key, value, day],
      );
    }
  }
  for (const m of s.missions) {
    await c.query(
      `INSERT INTO missions (game_id, id, type, girl_id, title, description, issued_day, deadline_day, reward, energy_reward, target, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (game_id, id) DO UPDATE SET status=EXCLUDED.status`,
      [gameId, m.id, m.type, m.girlId, m.title, m.description, m.issuedDay, m.deadlineDay, m.reward, m.energyReward, m.target, m.status],
    );
  }
}

export async function activeConversation(c: Client, gameId: number): Promise<{ id: number; convo: Conversation } | null> {
  const r = await c.query(`SELECT id, state FROM conversations WHERE game_id = $1 AND status = 'active'`, [gameId]);
  return r.rowCount ? { id: r.rows[0].id, convo: r.rows[0].state } : null;
}
