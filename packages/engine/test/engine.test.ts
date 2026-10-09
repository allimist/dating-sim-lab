import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, nextDay, startConversation, reply, apologize, score, tierOf, styleValue, defOf, publicOptions,
  GameError, type GameState, type Conversation, type ReplyOption,
} from '@dsl/engine';
import { BALANCE, GIRLS, cast } from '@dsl/content';

function girl(state: GameState, id: string) {
  return state.girls.find(g => g.id === id)!;
}

/** Plays a conversation to the end, choosing with `pick`. */
function playConvo(state: GameState, id: string, pick: (c: Conversation) => ReplyOption) {
  let r = startConversation(state, id);
  let s = r.state, c = r.convo;
  while (c.status === 'active') {
    const out = reply(s, c, pick(c).id);
    s = out.state; c = out.convo;
  }
  return { state: s, convo: c };
}

/** Runs to the ask turn and answers with a given job, for memory tests. */
function tellJob(state: GameState, id: string, job: string): GameState {
  let { state: s, convo: c } = startConversation(state, id);
  c = { ...c, plan: ['ask', 'close'], turn: 0, options: [], herLines: [] };
  c.options = [{ id: 'x', style: 'nice', tag: 'fact', fact: { key: 'job', value: job }, text: `I'm ${job}.` }];
  return reply(s, c, 'x').state;
}

test('the engine is deterministic for the same seed', () => {
  const a = playConvo(newGame(7), 'noa', c => c.options[0]);
  const b = playConvo(newGame(7), 'noa', c => c.options[0]);
  assert.deepEqual(a.convo.log, b.convo.log);
  assert.equal(girl(a.state, 'noa').affinity, girl(b.state, 'noa').affinity);
});

test('a memory told to one girl is never known by another girl', () => {
  let s = newGame(1);
  s = tellJob(s, 'maya', 'a pilot');
  assert.equal(girl(s, 'maya').memory.heToldMe.job?.value, 'a pilot');
  assert.equal(girl(s, 'noa').memory.heToldMe.job, undefined);
  // Telling Noa something different is NOT a contradiction: memories are separate.
  const before = girl(s, 'noa').affinity;
  s = tellJob(s, 'noa', 'a teacher');
  assert.equal(girl(s, 'noa').memory.heToldMe.job?.value, 'a teacher');
  assert.equal(girl(s, 'maya').memory.heToldMe.job?.value, 'a pilot');
  assert.ok(girl(s, 'noa').affinity >= before - 3, 'no contradiction penalty with a different girl');
});

test('contradicting what you told the SAME girl is penalised and called out', () => {
  let s = newGame(1);
  s = tellJob(s, 'dana', 'a doctor');
  s = nextDay(s).state;
  let { state, convo } = startConversation(s, 'dana');
  convo = { ...convo, plan: ['ask', 'close'], turn: 0 };
  convo.options = [{ id: 'x', style: 'nice', tag: 'fact', fact: { key: 'job', value: 'a chef' }, text: 'I\'m a chef.' }];
  const out = reply(state, convo, 'x');
  assert.ok(out.result.delta < 0, 'contradiction loses affinity');
  assert.match(out.result.reaction, /a doctor/);
});

test('mixing her up with another girl backfires, remembering her own story pays off', () => {
  const s = newGame(3);
  const mk = (correct: boolean): ReplyOption => ({ id: 'x', style: 'deep', tag: 'memory', text: '?', ref: { key: 'pet', thing: correct ? 'Mochi' : 'Bamba', correct, reply: 'Yes!' } });
  const run = (o: ReplyOption) => {
    const { state, convo } = startConversation(s, 'maya');
    return reply(state, { ...convo, options: [o] }, 'x').result;
  };
  const hit = run(mk(true)), miss = run(mk(false));
  assert.ok(hit.delta > miss.delta + 10);
  assert.match(miss.reaction, /Bamba/);
});

test('mood decides when a style works: charismatic while she is sad scores lower than deep listening', () => {
  const maya = defOf(newGame(1), 'maya');
  assert.ok(styleValue(maya, 'sad', 'charismatic') < styleValue(maya, 'sad', 'deep'));
  assert.ok(styleValue(maya, 'sad', 'flirty') < 0);
  const noa = defOf(newGame(1), 'noa');
  assert.ok(styleValue(noa, 'bored', 'funny') > styleValue(noa, 'bored', 'deep'));
});

test('flirting too early hurts, a sad girl hates jokes', () => {
  const s = newGame(5);
  s.girls.forEach(g => (g.mood = 'sad'));
  const { state, convo } = startConversation(s, 'noa');
  const flirt = reply(state, { ...convo, options: [{ id: 'f', style: 'flirty', text: '😉' }] }, 'f');
  assert.ok(flirt.result.delta < 0);
  const maya = startConversation(s, 'maya');
  const joke = reply(maya.state, { ...maya.convo, options: [{ id: 'j', style: 'funny', text: '😄' }] }, 'j');
  const listen = reply(maya.state, { ...maya.convo, options: [{ id: 'd', style: 'deep', text: '…' }] }, 'd');
  assert.ok(joke.result.delta < listen.result.delta);
});

test('public options never reveal which memory or gift is the right one', () => {
  const { convo } = startConversation(newGame(9), 'lia');
  for (const o of publicOptions(convo)) {
    assert.deepEqual(Object.keys(o).sort(), ['id', 'style', 'tag', 'text']);
  }
});

test('falling to the block threshold blocks her; an apology can bring her back', () => {
  let s = newGame(11);
  girl(s, 'dana').affinity = BALANCE.blockAt + 1;
  let { state, convo } = startConversation(s, 'dana');
  const out = reply(state, { ...convo, options: [{ id: 'b', style: 'confident', text: 'I\'m the best.' }] }, 'b');
  assert.equal(out.result.blockedNow, true);
  assert.equal(out.convo.status, 'ended');
  s = out.state;
  assert.throws(() => startConversation(nextDay(s).state, 'dana'), (e: unknown) => e instanceof GameError && e.code === 'blocked');
  // Dana forgives easily (0.8): try a few days until accepted.
  let next = nextDay(s).state;
  assert.ok(next.missions.some(m => m.type === 'win_back' && m.girlId === 'dana'));
  let accepted = false;
  for (let i = 0; i < 12 && !accepted && next.status === 'playing'; i++) {
    try {
      const a = apologize(next, 'dana');
      next = a.state;
      accepted = a.accepted;
    } catch (e) {
      if (!(e instanceof GameError)) throw e;
    }
    if (!accepted) next = nextDay(next).state;
  }
  assert.ok(accepted, 'apology eventually accepted');
  assert.equal(girl(next, 'dana').affinity, BALANCE.afterApologyAffinity);
  assert.equal(girl(next, 'dana').careful, true);
});

test('energy limits conversations; one conversation per girl per day', () => {
  let s = newGame(2);
  s = playConvo(s, 'maya', c => c.options[0]).state;
  assert.throws(() => startConversation(s, 'maya'), (e: unknown) => e instanceof GameError && e.code === 'already_talked');
  s = playConvo(s, 'noa', c => c.options[0]).state;
  assert.equal(s.energy, 0);
  assert.throws(() => startConversation(s, 'lia'), (e: unknown) => e instanceof GameError && e.code === 'no_energy');
  s = nextDay(s).state;
  assert.equal(s.energy, BALANCE.energyPerDay);
});

test('cheering up a sad girl completes the mission and lifts her mood', () => {
  let s = newGame(4);
  const g = girl(s, 'maya');
  g.mood = 'sad';
  s.missions.push({ id: 'mx', type: 'cheer_up', girlId: 'maya', title: '', description: '', issuedDay: 1, deadlineDay: 1, reward: 15, energyReward: 1, target: null, status: 'active' });
  const best = (c: Conversation) => [...c.options].sort((a, b) => styleValue(defOf(s, 'maya'), 'sad', b.style) - styleValue(defOf(s, 'maya'), 'sad', a.style))[0];
  const out = playConvo(s, 'maya', best);
  assert.equal(out.state.missions.find(m => m.id === 'mx')!.status, 'done');
  assert.equal(girl(out.state, 'maya').mood, 'happy');
  assert.equal(out.state.missionPoints, 15);
});

test('birthday turn appears on her birthday and the right gift completes the mission', () => {
  let s = newGame(6);
  while (s.day < GIRLS[1].birthdayDay) s = nextDay(s).state; // Noa
  assert.ok(s.missions.some(m => m.type === 'birthday' && m.girlId === 'noa' && m.status === 'active'));
  const out = playConvo(s, 'noa', c => c.options.find(o => o.gift?.correct) ?? c.options[0]);
  assert.ok(out.convo.plan.includes('birthday'));
  assert.equal(out.state.missions.find(m => m.type === 'birthday')!.status, 'done');
});

test('neglected girls cool down at the end of the day', () => {
  let s = newGame(8);
  girl(s, 'lia').affinity = 30;
  for (let i = 0; i < 4; i++) s = nextDay(s).state;
  assert.ok(girl(s, 'lia').affinity < 30);
});

test('the game ends after the last day and scores crushes', () => {
  let s = newGame(10, { maxDays: 3 });
  girl(s, 'maya').affinity = 90;
  while (s.status === 'playing') s = nextDay(s).state;
  assert.equal(s.status, 'over');
  assert.ok(score(s).crushes >= 1);
  assert.equal(tierOf(-70, true), 'blocked');
});

test('the cast scales to 100 unique girls', () => {
  const all = cast(100);
  assert.equal(all.length, 100);
  assert.equal(new Set(all.map(g => g.id)).size, 100);
  assert.ok(all.every(g => g.age >= 21));
  const s = newGame(1, { castSize: 100 });
  assert.equal(s.girls.length, 100);
  playConvo(s, 'g57', c => c.options[0]);
});
