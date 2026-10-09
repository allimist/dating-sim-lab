export const STYLES = ['nice', 'charismatic', 'funny', 'flirty', 'deep', 'confident'] as const;
export type Style = (typeof STYLES)[number];

export const MOODS = ['happy', 'sad', 'bored', 'stressed', 'excited'] as const;
export type Mood = (typeof MOODS)[number];

export const OUTCOMES = ['loved', 'liked', 'neutral', 'annoyed', 'offended'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Things the player can tell a girl about himself. Each girl remembers only her own copy. */
export const PLAYER_FACT_KEYS = ['job', 'hobby', 'pet', 'city', 'music', 'food'] as const;
export type PlayerFactKey = (typeof PLAYER_FACT_KEYS)[number];

export type HairStyle = 'long' | 'bob' | 'ponytail' | 'curly' | 'bun' | 'wavy';
export type Bangs = 'none' | 'straight' | 'side' | 'middle';

export interface FaceSpec {
  seed: number;
  skin?: string;
  hair?: string;
  hairStyle?: HairStyle;
  bangs?: Bangs;
  eyes?: string;
  lips?: string;
  top?: string;
  bg?: string;
  glasses?: boolean;
  earrings?: boolean;
  freckles?: boolean;
  mole?: boolean;
}

/** Something a girl tells the player about herself. Stored in her own memory once shared. */
export interface HerFact {
  key: string;
  /** Short noun the player might mix up, e.g. "Mochi". */
  thing: string;
  /** How it appears in "What you know about her". */
  label: string;
  /** Her line when she shares it. */
  share: string;
  /** The player's line when he asks about it later. */
  ask: string;
  /** Her happy answer when he remembers. */
  reply: string;
}

export interface GirlDef {
  id: string;
  name: string;
  age: number;
  city: string;
  job: string;
  bio: string;
  face: FaceSpec;
  /** -3 (hates) .. +3 (loves) for each reply style. */
  styles: Record<Style, number>;
  /** Relative chance of each daily mood. */
  moodBias: Record<Mood, number>;
  /** Player fact values she likes or dislikes (e.g. "jazz", "a cat"). */
  likes: string[];
  dislikes: string[];
  facts: HerFact[];
  favoriteGift: string;
  birthdayDay: number;
  /** 0..1, chance to accept an apology after blocking. */
  forgiveness: number;
  /** Lines in her own voice, used before the generic pool. */
  voice: Partial<Record<Outcome | 'greeting' | 'blocked', string[]>>;
}
