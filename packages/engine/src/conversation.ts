import {
  BALANCE, STYLES, PLAYER_FACT_KEYS, PLAYER_FACT_VALUES, HER_QUESTIONS, HER_RECALL_QUESTIONS, PLAYER_ANSWERS,
  CALLBACK_OPENERS, FIRST_OPENERS, OPENERS, GREETING_REPLIES, MOOD_SHARES, SHARE_RESPONSES, ABOUT_PROMPTS,
  ASK_HER, BIRTHDAY_PROMPTS, BIRTHDAY_GIFT, BIRTHDAY_GENERIC, CLOSING_PROMPTS, CLOSING_REPLIES, GOODBYES,
  type GirlDef, type PlayerFactKey, type Style, type ShareKind,
} from '@dsl/content';
import type { Conversation, GameState, GirlState, ReplyOption, ReplyResult, TurnKind } from './types';
import { GameError } from './types';
import { clone, defOf, fill, girlOf, hashSeed, noun, pickFresh, remember, rng, tierOf, tierRank, type Rng } from './util';
import { applyDelta, expressionFor, scoreReply } from './scoring';
import { otherGirlsFacts, unsharedFacts } from './memory';
import { checkMissions } from './missions';

const turnRng = (state: GameState, c: Conversation, salt: string) => rng(hashSeed(state.seed, c.day, c.girlId, c.turn, salt));

function styles(r: Rng, n: number): Style[] {
  return r.shuffle(STYLES).slice(0, n);
}

function say(girl: GirlState, c: Conversation, line: string) {
  c.herLines.push(line);
  remember(girl, line);
}

function buildGreet(state: GameState, c: Conversation, girl: GirlState, def: GirlDef, r: Rng) {
  const told = (Object.keys(girl.memory.heToldMe) as PlayerFactKey[]).filter(k => girl.memory.heToldMe[k]!.value !== 'no pets');
  let line: string;
  if (girl.conversations <= 1) line = fill(pickFresh(r, FIRST_OPENERS[girl.mood], girl.recentLines), { name: def.name });
  else if (told.length && girl.mood !== 'sad' && r.chance(0.5)) {
    const key = r.pick(told);
    const v = girl.memory.heToldMe[key]!.value;
    line = fill(r.pick(CALLBACK_OPENERS[key]), { v, n: noun(v) });
  } else {
    const warm = tierRank(tierOf(girl.affinity)) >= tierRank('likes');
    const pool = OPENERS[girl.mood][warm ? 'warm' : 'cold'];
    line = def.voice.greeting && r.chance(0.3) ? pickFresh(r, def.voice.greeting, girl.recentLines) : pickFresh(r, pool, girl.recentLines);
  }
  say(girl, c, line);
  c.options = styles(r, 4).map((s, i) => ({ id: `o${i}`, style: s, text: GREETING_REPLIES[girl.mood][s] }));
}

function buildAsk(state: GameState, c: Conversation, girl: GirlState, r: Rng) {
  const told = PLAYER_FACT_KEYS.filter(k => girl.memory.heToldMe[k]);
  const untold = PLAYER_FACT_KEYS.filter(k => !girl.memory.heToldMe[k]);
  const recall = told.length > 0 && (untold.length === 0 || r.chance(0.35));
  const key = recall ? r.pick(told) : r.pick(untold);
  say(girl, c, pickFresh(r, recall ? HER_RECALL_QUESTIONS[key] : HER_QUESTIONS[key], girl.recentLines));

  const known = girl.memory.heToldMe[key]?.value;
  const others = r.shuffle(PLAYER_FACT_VALUES[key].filter(v => v !== known));
  // On a recall question two answers repeat what he told her and two contradict it.
  const values = known ? [known, known, others[0], others[1]] : others.slice(0, 4);
  const st = styles(r, 4);
  c.options = r.shuffle(values.map((v, i) => ({
    id: `o${i}`, style: st[i], tag: 'fact' as const, fact: { key, value: v },
    text: fill(PLAYER_ANSWERS[key][st[i]], { v }),
  })));
}

function buildShare(state: GameState, c: Conversation, girl: GirlState, def: GirlDef, r: Rng) {
  const facts = unsharedFacts(girl, def);
  const moody = girl.mood !== 'happy' && (r.chance(0.6) || facts.length === 0);
  let kind: ShareKind = 'good';
  if (moody || facts.length === 0) {
    say(girl, c, pickFresh(r, MOOD_SHARES[girl.mood], girl.recentLines));
    kind = girl.mood === 'sad' || girl.mood === 'stressed' ? 'bad' : girl.mood === 'bored' ? 'bored' : 'good';
  } else {
    // She tells him something about herself. It is stored in HER memory of what she told him.
    const f = r.pick(facts.filter(x => x.key !== 'favorite').length && r.chance(0.7) ? facts.filter(x => x.key !== 'favorite') : facts);
    say(girl, c, f.share);
    girl.memory.iToldHim[f.key] = { value: f.thing, day: state.day };
    c.sharedFactKey = f.key;
  }
  c.shareKind = kind;
  c.options = styles(r, 4).map((s, i) => ({ id: `o${i}`, style: s, text: SHARE_RESPONSES[kind][s] }));
}

function buildAbout(state: GameState, c: Conversation, girl: GirlState, def: GirlDef, r: Rng) {
  say(girl, c, pickFresh(r, ABOUT_PROMPTS[girl.mood === 'sad' || girl.mood === 'stressed' ? 'down' : 'up'], girl.recentLines));
  const opts: ReplyOption[] = [];
  const known = def.facts.filter(f => girl.memory.iToldHim[f.key] && f.key !== c.sharedFactKey);
  if (known.length && r.chance(0.85)) {
    const f = r.pick(known);
    opts.push({ id: '', style: 'deep', tag: 'memory', text: f.ask, ref: { key: f.key, thing: f.thing, correct: true, reply: f.reply } });
  }
  const decoys = otherGirlsFacts(state, girl.id);
  if (decoys.length && r.chance(0.65)) {
    const f = r.pick(decoys);
    opts.push({ id: '', style: 'deep', tag: 'memory', text: f.ask, ref: { key: f.key, thing: f.thing, correct: false } });
  }
  for (const s of styles(r, 6)) {
    if (opts.length >= 4) break;
    if (opts.some(o => o.style === s)) continue;
    opts.push({ id: '', style: s, text: r.pick(ASK_HER[s]) });
  }
  c.options = r.shuffle(opts).map((o, i) => ({ ...o, id: `o${i}` }));
}

function buildBirthday(state: GameState, c: Conversation, girl: GirlState, def: GirlDef, r: Rng) {
  say(girl, c, pickFresh(r, BIRTHDAY_PROMPTS, girl.recentLines));
  const wrong = r.shuffle([...new Set([...defsGifts(state)].filter(g => g !== def.favoriteGift))]).slice(0, 2);
  const opts: ReplyOption[] = [
    { id: '', style: 'nice', tag: 'gift', text: fill(BIRTHDAY_GIFT, { gift: def.favoriteGift }), gift: { value: def.favoriteGift, correct: true } },
    ...wrong.map(g => ({ id: '', style: 'nice' as Style, tag: 'gift' as const, text: fill(BIRTHDAY_GIFT, { gift: g }), gift: { value: g, correct: false } })),
    { id: '', style: 'charismatic', text: BIRTHDAY_GENERIC, gift: { value: '', correct: null } },
  ];
  c.options = r.shuffle(opts).map((o, i) => ({ ...o, id: `o${i}` }));
}

function defsGifts(state: GameState) {
  const gifts = state.girls.map(g => defOf(state, g.id).favoriteGift);
  return gifts.length >= 3 ? gifts : [...gifts, 'a teddy bear', 'perfume', 'roses'];
}

function buildClose(state: GameState, c: Conversation, girl: GirlState, r: Rng) {
  const pool = c.total >= 8 ? CLOSING_PROMPTS.good : c.total >= 0 ? CLOSING_PROMPTS.ok : CLOSING_PROMPTS.bad;
  say(girl, c, pickFresh(r, pool, girl.recentLines));
  c.options = styles(r, 4).map((s, i) => ({ id: `o${i}`, style: s, text: CLOSING_REPLIES[s] }));
}

function buildTurn(state: GameState, c: Conversation) {
  const girl = girlOf(state, c.girlId);
  const def = defOf(state, c.girlId);
  const r = turnRng(state, c, 'build');
  const kind = c.plan[c.turn];
  if (kind === 'greet') buildGreet(state, c, girl, def, r);
  else if (kind === 'ask') buildAsk(state, c, girl, r);
  else if (kind === 'share') buildShare(state, c, girl, def, r);
  else if (kind === 'about') buildAbout(state, c, girl, def, r);
  else if (kind === 'birthday') buildBirthday(state, c, girl, def, r);
  else buildClose(state, c, girl, r);
}

/** Starts a conversation with one girl. Costs 1 energy; one conversation per girl per day. */
export function startConversation(input: GameState, girlId: string): { state: GameState; convo: Conversation } {
  const state = clone(input);
  if (state.status !== 'playing') throw new GameError('game_over', 'The game is over.');
  const girl = girlOf(state, girlId);
  const def = defOf(state, girlId);
  if (girl.blocked) throw new GameError('blocked', `${def.name} blocked you. Try an apology first.`);
  if (girl.talkedToday) throw new GameError('already_talked', `You already talked to ${def.name} today.`);
  if (state.energy <= 0) throw new GameError('no_energy', 'No energy left today. End the day to continue.');

  state.energy -= 1;
  girl.talkedToday = true;
  girl.lastTalkedDay = state.day;
  girl.conversations += 1;

  const birthday = state.missions.some(m => m.type === 'birthday' && m.girlId === girlId && m.status === 'active');
  const plan: TurnKind[] = ['greet', 'ask', 'share', birthday ? 'birthday' : 'about', 'close'];
  const convo: Conversation = {
    girlId, day: state.day, turn: 0, plan, herLines: [], options: [], total: 0, status: 'active',
    shareKind: 'good', sharedFactKey: null, giftHit: false, cheeredUp: false, endReason: null, goodbye: null, log: [],
  };
  buildTurn(state, convo);
  return { state, convo };
}

/** The player picks one reply. Returns the new state, the conversation and her reaction. */
export function reply(input: GameState, inputConvo: Conversation, optionId: string): { state: GameState; convo: Conversation; result: ReplyResult } {
  const state = clone(input);
  const c = clone(inputConvo);
  if (c.status !== 'active') throw new GameError('ended', 'This conversation is over.');
  const opt = c.options.find(o => o.id === optionId);
  if (!opt) throw new GameError('bad_option', 'Unknown reply option.');

  const girl = girlOf(state, c.girlId);
  const def = defOf(state, c.girlId);
  const r = turnRng(state, c, 'reply');
  const scored = scoreReply(def, girl, opt, r);
  const applied = applyDelta(girl, scored.delta);
  c.total += applied;
  remember(girl, scored.reaction);
  if (opt.fact) girl.memory.heToldMe[opt.fact.key] = { value: opt.fact.value, day: state.day };
  if (opt.gift?.correct) c.giftHit = true;
  if (girl.careful && girl.affinity >= 0) girl.careful = false;

  c.log.push({ turn: c.turn, kind: c.plan[c.turn], herLines: c.herLines, option: opt, delta: applied, outcome: scored.outcome, reaction: scored.reaction });
  c.herLines = [];
  c.options = [];

  let blockedNow = false;
  if (girl.affinity <= BALANCE.blockAt) {
    girl.blocked = true;
    girl.blockedSinceDay = state.day;
    girl.careful = false;
    blockedNow = true;
    c.status = 'ended';
    c.endReason = 'walked_out';
    c.goodbye = pickFresh(r, def.voice.blocked ?? GOODBYES.blocked, girl.recentLines);
  } else if (c.turn + 1 >= c.plan.length) {
    c.status = 'ended';
    c.endReason = 'finished';
    if (c.total >= BALANCE.cheerUpThreshold && (girl.mood === 'sad' || girl.mood === 'stressed')) {
      girl.mood = 'happy';
      c.cheeredUp = true;
    }
    const pool = c.total >= 12 ? GOODBYES.great : c.total >= 3 ? GOODBYES.good : c.total >= -4 ? GOODBYES.meh : GOODBYES.bad;
    c.goodbye = pickFresh(r, pool, girl.recentLines);
  } else {
    c.turn += 1;
    buildTurn(state, c);
  }

  const completedMissions = checkMissions(state, c);
  if (state.girls.every(g => !g.blocked && tierOf(g.affinity) === 'crush')) {
    state.status = 'over';
    state.perfect = true;
  }

  return {
    state,
    convo: c,
    result: {
      delta: applied,
      outcome: scored.outcome,
      reaction: scored.reaction,
      affinity: girl.affinity,
      tier: tierOf(girl.affinity, girl.blocked),
      expression: expressionFor(scored.outcome, girl),
      ended: c.status === 'ended',
      blockedNow,
      goodbye: c.goodbye,
      completedMissions,
    },
  };
}

/** Strips scoring secrets (which memory/gift is right) before sending options to the browser. */
export function publicOptions(c: Conversation) {
  return c.options.map(o => ({ id: o.id, text: o.text, style: o.style, tag: o.tag ?? null }));
}
