import type { GameState, Mission, MissionType, Conversation } from './types';
import { defOf, hashSeed, rng, tierOf, tierRank } from './util';

function add(state: GameState, m: Omit<Mission, 'id' | 'status' | 'issuedDay'>) {
  const mission: Mission = { ...m, id: `m${state.nextMissionNo++}`, status: 'active', issuedDay: state.day };
  state.missions.push(mission);
  return mission;
}

const active = (state: GameState, type: MissionType, girlId: string | null = null) =>
  state.missions.find(m => m.status === 'active' && m.type === type && m.girlId === girlId);

const daysSinceTalk = (state: GameState, lastTalkedDay: number | null) => state.day - (lastTalkedDay ?? 0);

/** Creates today's missions from the game state. Called on day 1 and on every new day. */
export function generateMissions(state: GameState) {
  const r = rng(hashSeed(state.seed, state.day, 'missions'));
  const open = state.girls.filter(g => !g.blocked);

  for (const g of open) {
    const d = defOf(state, g.id);
    if (d.birthdayDay === state.day) {
      add(state, {
        type: 'birthday', girlId: g.id, title: `🎂 It's ${d.name}'s birthday!`,
        description: `Talk to ${d.name} today and give her the gift she loves. Did she ever tell you what she likes?`,
        deadlineDay: state.day, reward: 20, energyReward: 0, target: null,
      });
    }
  }

  const sad = open.filter(g => g.mood === 'sad' && !active(state, 'birthday', g.id));
  if (sad.length) {
    const g = r.pick(sad);
    const d = defOf(state, g.id);
    add(state, {
      type: 'cheer_up', girlId: g.id, title: `😢 ${d.name} is sad today`,
      description: `Talk to ${d.name} and cheer her up. Be careful: jokes and flirting can make it worse.`,
      deadlineDay: state.day, reward: 15, energyReward: 1, target: null,
    });
  }

  const ignored = open.filter(g => g.lastTalkedDay !== null && daysSinceTalk(state, g.lastTalkedDay) >= 3 && !active(state, 'ignored', g.id));
  if (ignored.length) {
    const g = r.pick(ignored);
    const d = defOf(state, g.id);
    add(state, {
      type: 'ignored', girlId: g.id, title: `💬 ${d.name} feels ignored`,
      description: `You haven't talked to ${d.name} in ${daysSinceTalk(state, g.lastTalkedDay)} days. Have a good conversation with her today.`,
      deadlineDay: state.day, reward: 10, energyReward: 0, target: null,
    });
  }

  for (const g of state.girls.filter(x => x.blocked)) {
    if (active(state, 'win_back', g.id)) continue;
    const d = defOf(state, g.id);
    add(state, {
      type: 'win_back', girlId: g.id, title: `💔 ${d.name} blocked you`,
      description: `Apologise to ${d.name} and win her back (get her to Neutral again).`,
      deadlineDay: Math.min(state.maxDays, state.day + 7), reward: 25, energyReward: 1, target: null,
    });
  }

  if ((state.day - 1) % 7 === 0) {
    const week = Math.floor((state.day - 1) / 7);
    const target = Math.min(state.girls.length, 2 + week);
    add(state, {
      type: 'weekly', girlId: null, title: `⭐ Popular this week`,
      description: `Get ${target} girls to "Likes you" or better by the end of day ${Math.min(state.maxDays, state.day + 6)}.`,
      deadlineDay: Math.min(state.maxDays, state.day + 6), reward: 30, energyReward: 0, target,
    });
  }
}

function complete(state: GameState, m: Mission, done: Mission[]) {
  m.status = 'done';
  state.missionPoints += m.reward;
  state.energy += m.energyReward;
  done.push(m);
}

/**
 * Checks missions after something changed. `convo` is set when a conversation just ended
 * (or a gift was just given) so per-conversation goals can be judged.
 */
export function checkMissions(state: GameState, convo: Conversation | null): Mission[] {
  const done: Mission[] = [];
  for (const m of state.missions) {
    if (m.status !== 'active') continue;
    const g = m.girlId ? state.girls.find(x => x.id === m.girlId) : null;
    switch (m.type) {
      case 'birthday':
        if (convo && convo.girlId === m.girlId && convo.giftHit) complete(state, m, done);
        break;
      case 'cheer_up':
        if (convo && convo.girlId === m.girlId && convo.status === 'ended' && convo.cheeredUp) complete(state, m, done);
        break;
      case 'ignored':
        if (convo && convo.girlId === m.girlId && convo.status === 'ended' && convo.total >= 3) complete(state, m, done);
        break;
      case 'win_back':
        if (g && !g.blocked && g.affinity >= -14) complete(state, m, done);
        break;
      case 'weekly': {
        const count = state.girls.filter(x => !x.blocked && tierRank(tierOf(x.affinity)) >= tierRank('likes')).length;
        if (count >= (m.target ?? 0)) complete(state, m, done);
        break;
      }
    }
  }
  return done;
}

/** Marks missions whose deadline was today as failed. Called when the day ends. */
export function expireMissions(state: GameState): Mission[] {
  const failed: Mission[] = [];
  for (const m of state.missions) {
    if (m.status === 'active' && m.deadlineDay <= state.day) {
      m.status = 'failed';
      failed.push(m);
    }
  }
  return failed;
}
