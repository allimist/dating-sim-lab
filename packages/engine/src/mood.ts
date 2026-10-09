import { MOODS, type GirlDef, type Mood } from '@dsl/content';
import { hashSeed, rng } from './util';

/** Her mood for a day: weighted by personality, deterministic per (game seed, day, girl). */
export function rollMood(seed: number, day: number, def: GirlDef): Mood {
  const r = rng(hashSeed(seed, day, def.id, 'mood'));
  const total = MOODS.reduce((s, m) => s + def.moodBias[m], 0);
  let x = r.next() * total;
  for (const m of MOODS) {
    x -= def.moodBias[m];
    if (x <= 0) return m;
  }
  return 'happy';
}
