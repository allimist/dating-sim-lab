import {
  BALANCE, MOOD_MODIFIERS, REACTIONS, STYLE_REACTIONS, CONTRADICTION_REACTIONS, CONSISTENT_PREFIX,
  LIKED_TOPIC, DISLIKED_TOPIC, DECOY_REACTIONS, GIFT_LOVED, GIFT_WRONG, FACT_PHRASE,
  type GirlDef, type Mood, type Outcome, type Style,
} from '@dsl/content';
import type { Expression, GameState, GirlState, ReplyOption } from './types';
import { fill, noun, pickFresh, tierOf, tierRank, type Rng } from './util';

export interface Scored {
  delta: number;
  outcome: Outcome;
  reaction: string;
}

/** Raw points a style earns with her in this mood (before extras). */
export function styleValue(def: GirlDef, mood: Mood, style: Style) {
  return (BALANCE.tasteWeight * def.styles[style] + BALANCE.moodWeight * MOOD_MODIFIERS[mood][style]) * BALANCE.styleScale;
}

export function outcomeOf(delta: number): Outcome {
  if (delta >= 7) return 'loved';
  if (delta >= 3) return 'liked';
  if (delta >= -2) return 'neutral';
  if (delta >= -6) return 'annoyed';
  return 'offended';
}

/** Score one reply and write her reaction. Pure apart from the passed RNG. */
export function scoreReply(def: GirlDef, girl: GirlState, opt: ReplyOption, r: Rng): Scored {
  let delta = styleValue(def, girl.mood, opt.style);
  let override: string | null = null;
  let prefix = '';

  if (opt.style === 'flirty' && tierRank(tierOf(girl.affinity)) < tierRank('likes')) delta += BALANCE.earlyFlirt;

  if (opt.fact) {
    const { key, value } = opt.fact;
    const told = girl.memory.heToldMe[key];
    if (told && told.value !== value) {
      delta += BALANCE.contradiction;
      override = fill(r.pick(CONTRADICTION_REACTIONS), { phrase: fill(FACT_PHRASE[key], { v: told.value }), new: value });
    } else if (told) {
      delta += BALANCE.consistentFact;
      prefix += r.pick(CONSISTENT_PREFIX);
    }
    if (!override && def.likes.includes(value)) {
      delta += BALANCE.likedTopic;
      prefix += fill(r.pick(LIKED_TOPIC), { n: noun(value) });
    } else if (!override && def.dislikes.includes(value)) {
      delta += BALANCE.dislikedTopic;
      prefix += fill(r.pick(DISLIKED_TOPIC), { n: noun(value) });
    }
  }

  if (opt.ref) {
    if (opt.ref.correct) {
      delta += BALANCE.memoryHit;
      override = opt.ref.reply ?? null;
    } else {
      delta += BALANCE.memoryMixup;
      override = fill(r.pick(DECOY_REACTIONS), { thing: opt.ref.thing });
    }
  }

  if (opt.gift) {
    if (opt.gift.correct === true) {
      delta += BALANCE.giftHit;
      override = fill(r.pick(GIFT_LOVED), { gift: opt.gift.value });
    } else if (opt.gift.correct === false) {
      delta += BALANCE.giftWrong;
      override = fill(r.pick(GIFT_WRONG), { gift: opt.gift.value });
    } else {
      delta += BALANCE.giftGeneric;
    }
  }

  delta = Math.round(delta + r.int(-1, 1));
  const outcome = outcomeOf(delta);
  const reaction = override ?? prefix + reactionLine(def, girl, opt.style, outcome, r);
  return { delta, outcome, reaction };
}

function reactionLine(def: GirlDef, girl: GirlState, style: Style, outcome: Outcome, r: Rng) {
  const group = outcome === 'loved' || outcome === 'liked' ? 'good' : outcome === 'neutral' ? null : 'bad';
  const fresh = (lines?: string[]) => (lines ?? []).filter(l => !girl.recentLines.includes(l));
  const own = fresh(def.voice[outcome]);
  if (own.length && r.chance(0.35)) return r.pick(own);
  if (group) {
    const specific = fresh([...(STYLE_REACTIONS[`${group}:${style}:${girl.mood}`] ?? []), ...(STYLE_REACTIONS[`${group}:${style}:*`] ?? [])]);
    if (specific.length && r.chance(0.7)) return r.pick(specific);
  }
  return pickFresh(r, REACTIONS[outcome], girl.recentLines);
}

/** Applies diminishing returns on gains and the "careful" penalty on losses. */
export function applyDelta(girl: GirlState, delta: number): number {
  let applied = delta;
  if (delta > 0) applied = Math.max(1, Math.round(delta * Math.max(0.15, 1 - girl.affinity / BALANCE.damping)));
  else if (delta < 0 && girl.careful) applied = Math.round(delta * BALANCE.carefulMultiplier);
  const before = girl.affinity;
  girl.affinity = Math.max(-100, Math.min(100, girl.affinity + applied));
  return girl.affinity - before;
}

export function expressionFor(outcome: Outcome | null, girl: Pick<GirlState, 'mood' | 'affinity' | 'blocked'>): Expression {
  if (girl.blocked) return 'angry';
  if (outcome === 'loved') return 'happy';
  if (outcome === 'liked') return 'smile';
  if (outcome === 'annoyed') return 'annoyed';
  if (outcome === 'offended') return 'angry';
  if (girl.mood === 'sad') return 'sad';
  if (girl.mood === 'stressed') return 'annoyed';
  const tier = tierOf(girl.affinity);
  if (tier === 'crush' || girl.mood === 'excited') return 'happy';
  if (tier === 'likes' || girl.mood === 'happy') return 'smile';
  if (tier === 'dislikes') return 'annoyed';
  return 'neutral';
}

export function score(state: GameState) {
  const crushes = state.girls.filter(g => !g.blocked && tierOf(g.affinity) === 'crush').length;
  const affinity = state.girls.reduce((s, g) => s + g.affinity, 0);
  const perfectBonus = state.perfect ? BALANCE.perfectBonus + BALANCE.perfectDayBonus * Math.max(0, state.maxDays - state.day) : 0;
  return {
    total: affinity + state.missionPoints + crushes * BALANCE.crushBonus + perfectBonus,
    affinity,
    missionPoints: state.missionPoints,
    crushes,
    likes: state.girls.filter(g => !g.blocked && tierRank(tierOf(g.affinity)) >= tierRank('likes')).length,
    blocked: state.girls.filter(g => g.blocked).length,
    perfectBonus,
  };
}
