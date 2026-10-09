import type { Mood, Style } from './types';

/**
 * How each mood shifts every style, added to the girl's personal weight.
 * This table is the core skill of the game: when to be nice, when to be charismatic.
 */
export const MOOD_MODIFIERS: Record<Mood, Record<Style, number>> = {
  happy: { nice: 0, charismatic: 1, funny: 1, flirty: 1, deep: 0, confident: 0 },
  sad: { nice: 2, charismatic: -2, funny: -2, flirty: -5, deep: 3, confident: -4 },
  bored: { nice: -1, charismatic: 2, funny: 2, flirty: 0, deep: -2, confident: 0 },
  stressed: { nice: 2, charismatic: -1, funny: 0, flirty: -4, deep: 1, confident: -2 },
  excited: { nice: 0, charismatic: 2, funny: 1, flirty: 1, deep: -1, confident: 1 },
};

/** Player-facing hints (shown in the UI). Same information the "mood-aware" bot uses. */
export const MOOD_HINTS: Record<Mood, string> = {
  happy: 'Happy: playful replies land well.',
  sad: 'Sad: listen and be kind. Jokes, flirting and bragging backfire.',
  bored: 'Bored: be fun and charismatic. Heavy talk bores her more.',
  stressed: 'Stressed: be kind and patient. No flirting.',
  excited: 'Excited: match her energy!',
};

export const MOOD_EMOJI: Record<Mood, string> = { happy: '😊', sad: '😢', bored: '🥱', stressed: '😣', excited: '🤩' };

export const STYLE_LABELS: Record<Style, { label: string; emoji: string }> = {
  nice: { label: 'Nice', emoji: '🤗' },
  charismatic: { label: 'Charismatic', emoji: '✨' },
  funny: { label: 'Funny', emoji: '😂' },
  flirty: { label: 'Flirty', emoji: '😉' },
  deep: { label: 'Deep listener', emoji: '💭' },
  confident: { label: 'Confident', emoji: '😎' },
};

export const TIERS = [
  { id: 'blocked', label: 'Blocked you', min: -100 },
  { id: 'dislikes', label: 'Dislikes you', min: -59 },
  { id: 'neutral', label: 'Neutral', min: -14 },
  { id: 'likes', label: 'Likes you', min: 25 },
  { id: 'crush', label: 'Has a crush on you', min: 70 },
] as const;
export type TierId = (typeof TIERS)[number]['id'];

/** Balancing knobs. Tuned with `npm run simulate`. */
export const BALANCE = {
  maxDays: 30,
  energyPerDay: 2,
  turnsPerConversation: 5,
  /** Points per unit of (tasteWeight * her style weight + mood modifier). */
  styleScale: 1.2,
  /** How much her personal taste counts relative to her mood. */
  tasteWeight: 2.2,
  /** How much her mood of the day counts. */
  moodWeight: 0.7,
  likedTopic: 3,
  dislikedTopic: -4,
  consistentFact: 2,
  contradiction: -10,
  memoryHit: 6,
  memoryMixup: -9,
  giftHit: 12,
  giftWrong: -5,
  giftGeneric: 2,
  earlyFlirt: -4,
  /** Positive gains shrink as affinity rises: gain *= 1 - affinity / damping. */
  damping: 90,
  /** After an accepted apology, negatives hurt this much more. */
  carefulMultiplier: 1.5,
  blockAt: -60,
  afterApologyAffinity: -40,
  apologyRetryDays: 4,
  neglectDays: 3,
  neglectPenalty: 4,
  driftPenalty: 2,
  cheerUpThreshold: 6,
  crushBonus: 50,
  perfectBonus: 200,
  perfectDayBonus: 10,
} as const;
