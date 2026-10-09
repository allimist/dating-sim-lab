import { cast, rng, hashSeed, TIERS, type GirlDef, type TierId, type Rng } from '@dsl/content';
import type { GameState, GirlState } from './types';

export { rng, hashSeed };
export type { Rng };

const castCache = new Map<number, Map<string, GirlDef>>();

/** Character definitions for a game, by id. */
export function defs(state: Pick<GameState, 'castSize'>): Map<string, GirlDef> {
  let m = castCache.get(state.castSize);
  if (!m) {
    m = new Map(cast(state.castSize).map(g => [g.id, g]));
    castCache.set(state.castSize, m);
  }
  return m;
}

export function defOf(state: Pick<GameState, 'castSize'>, girlId: string): GirlDef {
  const d = defs(state).get(girlId);
  if (!d) throw new Error(`unknown girl ${girlId}`);
  return d;
}

export function girlOf(state: GameState, girlId: string): GirlState {
  const g = state.girls.find(x => x.id === girlId);
  if (!g) throw new Error(`unknown girl ${girlId}`);
  return g;
}

export function tierOf(affinity: number, blocked = false): TierId {
  if (blocked) return 'blocked';
  let t: TierId = 'dislikes';
  for (const tier of TIERS) if (tier.id !== 'blocked' && affinity >= tier.min) t = tier.id;
  return t;
}

export const tierRank = (t: TierId) => ['blocked', 'dislikes', 'neutral', 'likes', 'crush'].indexOf(t);

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "a dog" -> "dog", "no pets" -> "pets". */
export function noun(v: string) {
  return v.replace(/^(a|an|no)\s+/i, '');
}

/** Fill {v} {V} {n} {N} {name} {gift} {Gift} {thing} {Thing} {phrase} {new} slots. */
export function fill(template: string, slots: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    const lower = key.toLowerCase();
    const val = slots[lower] ?? slots[key];
    if (val === undefined) return m;
    return key[0] === key[0].toUpperCase() && key[0] !== key[0].toLowerCase() ? cap(val) : val;
  });
}

/** Pick a line she has not said recently, if possible. */
export function pickFresh(r: Rng, lines: readonly string[], recent: readonly string[]) {
  const fresh = lines.filter(l => !recent.includes(l));
  return r.pick(fresh.length ? fresh : lines);
}

export function remember(g: GirlState, line: string) {
  g.recentLines = [...g.recentLines, line].slice(-16);
}

export const clone = <T>(x: T): T => structuredClone(x);
