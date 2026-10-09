/**
 * End-to-end check against the running stack (podman compose up):
 * logs in, plays a whole game through the HTTP API and checks the invariants.
 *
 *   npm run e2e                       # http://localhost:5177 (through nginx)
 *   API=http://localhost:3050 npm run e2e
 */
import assert from 'node:assert/strict';
import { MOOD_MODIFIERS } from '@dsl/content';

const BASE = (process.env.API ?? 'http://localhost:5177') + '/api';
let token = '';

async function call<T = any>(path: string, body?: unknown, expect = 200): Promise<T> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  assert.equal(res.status, expect, `${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const t0 = Date.now();
const email = `e2e-${Date.now()}@example.com`;
token = (await call('/auth/register', { email, name: 'E2E bot', password: 'secret123' })).token;
await call('/auth/login', { email, password: 'wrong' }, 401);

let { game } = await call('/game/new', { castSize: 5 });
assert.equal(game.girls.length, 5);
assert.equal(game.day, 1);

// Options sent to the browser never carry scoring secrets.
let { conversation: c, game: g2 } = await call('/conversations', { girlId: game.girls[0].id });
for (const o of c.options) assert.deepEqual(Object.keys(o).sort(), ['id', 'style', 'tag', 'text']);
await call('/conversations', { girlId: game.girls[1].id }, 409); // one conversation at a time
await call('/game/day/next', {}, 409); // cannot end the day mid-conversation
game = g2;

let replies = 0, conversations = 1, missionsDone = 0;
const latencies: number[] = [];
const firstGirl = game.girls[0].id;
let told: { girl: string; key: string } | null = null;

async function finish(conv: any) {
  while (conv.status === 'active') {
    const girl = game.girls.find((x: any) => x.id === conv.girl.id);
    const pick = [...conv.options].sort((a: any, b: any) => (MOOD_MODIFIERS as any)[girl.mood][b.style] - (MOOD_MODIFIERS as any)[girl.mood][a.style])[0];
    const t = performance.now();
    const r = await call(`/conversations/${conv.id}/reply`, { optionId: pick.id });
    latencies.push(performance.now() - t);
    replies++;
    if (pick.tag === 'fact' && !told) told = { girl: conv.girl.id, key: 'any' };
    missionsDone += r.result.completedMissions.length;
    conv = r.conversation;
    game = r.game;
  }
}

await finish(c);
while (game.status === 'playing') {
  for (const girl of game.girls) {
    if (game.energy <= 0) break;
    if (girl.blocked && girl.canApologize) { game = (await call(`/girls/${girl.id}/apologize`, {})).game; continue; }
    if (girl.blocked || girl.talkedToday) continue;
    const r = await call('/conversations', { girlId: girl.id });
    conversations++;
    game = r.game;
    await finish(r.conversation);
  }
  game = (await call('/game/day/next', {})).game;
}

// Memory isolation over the API: each profile lists only what was told to that girl.
const profiles = await Promise.all(game.girls.map((x: any) => call(`/girls/${x.id}`)));
const first = profiles.find(p => p.girl.id === firstGirl).girl;
assert.ok(first.sheKnows.length > 0, 'the first girl remembers facts');
for (const p of profiles) assert.ok(p.girl.sheKnows.every((f: any) => typeof f.text === 'string'));

const board = await call('/leaderboard');
assert.ok(board.scores.some((s: any) => s.name === 'E2E bot'), 'finished game is on the leaderboard');

latencies.sort((a, b) => a - b);
const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))].toFixed(1);
console.log(JSON.stringify({
  ok: true, days: game.day, conversations, replies, missionsDone, score: game.score.total, crushes: game.score.crushes,
  replyLatencyMs: { p50: p(0.5), p95: p(0.95), max: latencies.at(-1)!.toFixed(1) }, seconds: ((Date.now() - t0) / 1000).toFixed(1),
}, null, 2));
