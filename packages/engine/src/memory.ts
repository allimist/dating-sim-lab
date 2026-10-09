import type { GirlDef, HerFact, PlayerFactKey } from '@dsl/content';
import type { GameState, GirlState } from './types';
import { defOf } from './util';

/** What she knows about the player. Reads ONLY her own memory. */
export function whatSheKnows(girl: GirlState): { key: PlayerFactKey; value: string; day: number }[] {
  return Object.entries(girl.memory.heToldMe).map(([key, e]) => ({ key: key as PlayerFactKey, value: e!.value, day: e!.day }));
}

/** What the player has learned about her (facts she shared with him). */
export function whatHeKnows(girl: GirlState, def: GirlDef): (HerFact & { day: number })[] {
  return def.facts.filter(f => girl.memory.iToldHim[f.key]).map(f => ({ ...f, day: girl.memory.iToldHim[f.key].day }));
}

export function unsharedFacts(girl: GirlState, def: GirlDef): HerFact[] {
  return def.facts.filter(f => !girl.memory.iToldHim[f.key]);
}

/**
 * Facts the player learned from OTHER girls. They are the player's knowledge, never hers:
 * used only to offer tempting "mix-up" replies that she will not recognise.
 */
export function otherGirlsFacts(state: GameState, girlId: string): HerFact[] {
  const mine = defOf(state, girlId);
  const myThings = new Set(mine.facts.map(f => f.thing.toLowerCase()));
  const out: HerFact[] = [];
  for (const g of state.girls) {
    if (g.id === girlId) continue;
    const d = defOf(state, g.id);
    for (const f of d.facts) if (g.memory.iToldHim[f.key] && !myThings.has(f.thing.toLowerCase())) out.push(f);
  }
  return out;
}
