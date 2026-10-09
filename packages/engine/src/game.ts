import { BALANCE, APOLOGY_ACCEPTED, APOLOGY_REJECTED, cast } from '@dsl/content';
import type { DaySummary, GameState, GirlState } from './types';
import { GameError } from './types';
import { clone, defOf, girlOf, hashSeed, pickFresh, rng } from './util';
import { rollMood } from './mood';
import { generateMissions, expireMissions, checkMissions } from './missions';

export interface NewGameOptions {
  castSize?: number;
  maxDays?: number;
  energyPerDay?: number;
}

export function newGame(seed: number, opts: NewGameOptions = {}): GameState {
  const castSize = opts.castSize ?? 5;
  const state: GameState = {
    seed: seed >>> 0,
    day: 1,
    maxDays: opts.maxDays ?? BALANCE.maxDays,
    energyPerDay: opts.energyPerDay ?? BALANCE.energyPerDay,
    energy: opts.energyPerDay ?? BALANCE.energyPerDay,
    castSize,
    missionPoints: 0,
    nextMissionNo: 1,
    status: 'playing',
    perfect: false,
    girls: cast(castSize).map((d): GirlState => ({
      id: d.id, affinity: 0, mood: rollMood(seed >>> 0, 1, d), blocked: false, blockedSinceDay: null,
      apologyDay: null, careful: false, lastTalkedDay: null, talkedToday: false, dayStartAffinity: 0,
      conversations: 0, recentLines: [], memory: { heToldMe: {}, iToldHim: {} },
    })),
    missions: [],
  };
  generateMissions(state);
  return state;
}

/** Ends the current day: neglect, expiring missions, new moods, new missions. */
export function nextDay(input: GameState): { state: GameState; summary: DaySummary } {
  const state = clone(input);
  if (state.status !== 'playing') throw new GameError('game_over', 'The game is over.');

  for (const g of state.girls) {
    if (g.blocked || g.talkedToday) continue;
    const since = state.day - (g.lastTalkedDay ?? 0);
    if (since >= BALANCE.neglectDays) g.affinity = Math.max(-100, g.affinity - BALANCE.neglectPenalty);
    else if (g.affinity > 0) g.affinity -= BALANCE.driftPenalty;
  }
  const failedMissions = expireMissions(state);
  const summary: DaySummary = {
    day: state.day,
    entries: state.girls.map(g => ({ girlId: g.id, from: g.dayStartAffinity, to: g.affinity, talked: g.talkedToday, blocked: g.blocked })),
    failedMissions,
    gameOver: false,
  };

  if (state.day >= state.maxDays) {
    state.status = 'over';
    summary.gameOver = true;
    return { state, summary };
  }

  state.day += 1;
  state.energy = state.energyPerDay;
  for (const g of state.girls) {
    g.talkedToday = false;
    g.dayStartAffinity = g.affinity;
    g.mood = rollMood(state.seed, state.day, defOf(state, g.id));
  }
  generateMissions(state);
  return { state, summary };
}

/** A blocked girl can receive one apology every few days. Costs 1 energy. */
export function apologize(input: GameState, girlId: string): { state: GameState; accepted: boolean; line: string } {
  const state = clone(input);
  const g = girlOf(state, girlId);
  const d = defOf(state, girlId);
  if (state.status !== 'playing') throw new GameError('game_over', 'The game is over.');
  if (!g.blocked) throw new GameError('not_blocked', `${d.name} is not blocking you.`);
  if (g.apologyDay !== null && state.day - g.apologyDay < BALANCE.apologyRetryDays) {
    throw new GameError('too_soon', `${d.name} needs time. Try again on day ${g.apologyDay + BALANCE.apologyRetryDays}.`);
  }
  if (state.energy <= 0) throw new GameError('no_energy', 'No energy left today.');
  state.energy -= 1;
  g.apologyDay = state.day;
  const r = rng(hashSeed(state.seed, state.day, girlId, 'apology'));
  const accepted = r.next() < d.forgiveness;
  let line: string;
  if (accepted) {
    g.blocked = false;
    g.blockedSinceDay = null;
    g.affinity = BALANCE.afterApologyAffinity;
    g.careful = true;
    line = pickFresh(r, APOLOGY_ACCEPTED, g.recentLines);
  } else {
    line = pickFresh(r, APOLOGY_REJECTED, g.recentLines);
  }
  checkMissions(state, null);
  return { state, accepted, line };
}
