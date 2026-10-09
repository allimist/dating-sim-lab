/** Shapes engine state into what the browser sees. Scoring secrets never leave the server. */
import {
  defOf, tierOf, score, expressionFor, publicOptions, whatSheKnows, whatHeKnows,
  type Conversation, type GameState,
} from '@dsl/engine';
import { BALANCE, MOOD_EMOJI, MOOD_HINTS, TIERS, STYLE_LABELS, PROFILE_PHRASE, PLAYER_FACT_KEYS } from '@dsl/content';

const tierLabel = (id: string) => TIERS.find(t => t.id === id)!.label;

export function girlCard(state: GameState, id: string) {
  const g = state.girls.find(x => x.id === id)!;
  const d = defOf(state, id);
  const tier = tierOf(g.affinity, g.blocked);
  const apologyDay = g.apologyDay === null ? null : g.apologyDay + BALANCE.apologyRetryDays;
  return {
    id, name: d.name, age: d.age, city: d.city, job: d.job, bio: d.bio, face: d.face,
    mood: g.mood, moodEmoji: MOOD_EMOJI[g.mood], affinity: g.affinity, tier, tierLabel: tierLabel(tier),
    blocked: g.blocked, careful: g.careful, talkedToday: g.talkedToday, lastTalkedDay: g.lastTalkedDay,
    conversations: g.conversations,
    canApologize: g.blocked && (apologyDay === null || state.day >= apologyDay),
    apologyAvailableDay: g.blocked ? apologyDay : null,
    expression: expressionFor(null, g),
    birthdayToday: d.birthdayDay === state.day,
  };
}

export function gameView(gameId: number, state: GameState, extra: { activeConversationId?: number | null; lastSummary?: unknown } = {}) {
  return {
    id: gameId,
    day: state.day,
    maxDays: state.maxDays,
    energy: state.energy,
    energyPerDay: state.energyPerDay,
    status: state.status,
    perfect: state.perfect,
    castSize: state.castSize,
    score: score(state),
    girls: state.girls.map(g => girlCard(state, g.id)),
    missions: state.missions
      .filter(m => m.status === 'active' || m.issuedDay >= state.day - 1)
      .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || b.issuedDay - a.issuedDay),
    activeConversationId: extra.activeConversationId ?? null,
    lastSummary: extra.lastSummary ?? null,
    hints: MOOD_HINTS,
    styles: STYLE_LABELS,
  };
}

/** The girl's profile: what SHE knows about you (her memory only) and what you know about her. */
export function profileView(state: GameState, id: string, history: unknown[]) {
  const g = state.girls.find(x => x.id === id)!;
  const d = defOf(state, id);
  return {
    ...girlCard(state, id),
    sheKnows: whatSheKnows(g).map(f => ({ key: f.key, text: `She thinks ${fillPhrase(f.key, f.value)}`, day: f.day })),
    youKnow: whatHeKnows(g, d).map(f => ({ key: f.key, text: f.label, day: f.day })),
    unknownTopics: PLAYER_FACT_KEYS.filter(k => !g.memory.heToldMe[k]),
    history,
  };
}

function fillPhrase(key: (typeof PLAYER_FACT_KEYS)[number], value: string) {
  return PROFILE_PHRASE[key].replace('{v}', value);
}

export function conversationView(id: number, state: GameState, c: Conversation) {
  const g = state.girls.find(x => x.id === c.girlId)!;
  const messages: { from: 'her' | 'me'; text: string; style?: string; delta?: number; outcome?: string }[] = [];
  for (const t of c.log) {
    for (const line of t.herLines) messages.push({ from: 'her', text: line });
    messages.push({ from: 'me', text: t.option.text, style: t.option.style });
    messages.push({ from: 'her', text: t.reaction, delta: t.delta, outcome: t.outcome });
  }
  for (const line of c.herLines) messages.push({ from: 'her', text: line });
  if (c.goodbye) messages.push({ from: 'her', text: c.goodbye });
  const last = c.log.at(-1);
  return {
    id,
    girl: girlCard(state, c.girlId),
    status: c.status,
    turn: c.turn,
    turns: c.plan.length,
    total: c.total,
    endReason: c.endReason,
    messages,
    options: c.status === 'active' ? publicOptions(c) : [],
    expression: expressionFor(last?.outcome ?? null, g),
  };
}
