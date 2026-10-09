/**
 * Balancing simulator: plays thousands of seeded games with bot strategies and
 * reports how each one does. Only adaptive strategies should win reliably.
 *
 *   npm run simulate              # 2000 games per strategy
 *   npm run simulate -- 10000     # more games
 *   npm run simulate -- 2000 --ci # exit 1 if a single-style bot wins too often
 */
import {
  newGame, nextDay, startConversation, reply, apologize, score, defOf, tierOf, tierRank,
  type GameState, type Conversation, type ReplyOption, GameError,
} from '@dsl/engine';
import { MOOD_MODIFIERS, BALANCE, STYLES, type Style } from '@dsl/content';

type Picker = (state: GameState, convo: Conversation, brain: Brain) => ReplyOption;

/** What a bot has learned by playing (per girl, per style), like a human would. */
class Brain {
  sum = new Map<string, number>();
  n = new Map<string, number>();
  learn(girlId: string, style: Style, styleScore: number) {
    const k = `${girlId}:${style}`;
    this.sum.set(k, (this.sum.get(k) ?? 0) + styleScore);
    this.n.set(k, (this.n.get(k) ?? 0) + 1);
  }
  estimate(girlId: string, style: Style) {
    const k = `${girlId}:${style}`;
    const n = this.n.get(k) ?? 0;
    return n ? this.sum.get(k)! / n : 1.5; // optimistic prior: try everything once
  }
}

const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const singleStyle = (style: Style): Picker => (_s, c) => c.options.find(o => o.style === style) ?? random(c.options);

const randomPicker: Picker = (_s, c) => random(c.options);

/** Knows the public mood hints, nothing about the girl. */
const moodAware: Picker = (s, c) => {
  const g = s.girls.find(x => x.id === c.girlId)!;
  return [...c.options].sort((a, b) => MOOD_MODIFIERS[g.mood][b.style] - MOOD_MODIFIERS[g.mood][a.style])[0];
};

/** Mood hints + learns each girl's taste + uses only legitimate memory (what each girl told him). */
const adaptive: Picker = (s, c, brain) => {
  const g = s.girls.find(x => x.id === c.girlId)!;
  const d = defOf(s, c.girlId);
  const value = (o: ReplyOption) => {
    let v = (brain.estimate(c.girlId, o.style) + BALANCE.moodWeight * MOOD_MODIFIERS[g.mood][o.style]) * BALANCE.styleScale;
    if (o.style === 'flirty' && tierRank(tierOf(g.affinity)) < tierRank('likes')) v += BALANCE.earlyFlirt;
    if (o.fact) {
      const told = g.memory.heToldMe[o.fact.key];
      if (told) v += told.value === o.fact.value ? 5 : -20;
    }
    if (o.tag === 'memory') {
      // He only trusts a memory if THIS girl told it to him.
      const hers = d.facts.some(f => g.memory.iToldHim[f.key] && o.text === f.ask);
      v += hers ? 8 : -20;
    }
    if (o.gift) {
      const fav = d.facts.find(f => f.key === 'favorite');
      const knows = fav && g.memory.iToldHim[fav.key];
      if (o.gift.value === '') v += 2;
      else if (knows) v += o.gift.value === fav!.thing ? 15 : -10;
      else v -= 3;
    }
    return v;
  };
  return [...c.options].sort((a, b) => value(b) - value(a))[0];
};

/** Who to talk to: missions first, then girls furthest from a crush. */
function chooseGirl(s: GameState, smart: boolean): string | null {
  const open = s.girls.filter(g => !g.blocked && !g.talkedToday);
  if (!open.length) return null;
  if (!smart) return random(open).id;
  const missionGirls = new Set(s.missions.filter(m => m.status === 'active' && m.girlId).map(m => m.girlId));
  return [...open].sort((a, b) => {
    const ma = missionGirls.has(a.id) ? 1 : 0, mb = missionGirls.has(b.id) ? 1 : 0;
    if (ma !== mb) return mb - ma;
    return Math.min(a.affinity, 69) - Math.min(b.affinity, 69);
  })[0].id;
}

function play(seed: number, picker: Picker, smart: boolean) {
  let s = newGame(seed);
  const brain = new Brain();
  while (s.status === 'playing') {
    for (const g of s.girls) {
      if (g.blocked && s.energy > 0) {
        try { s = apologize(s, g.id).state; } catch (e) { if (!(e instanceof GameError)) throw e; }
      }
    }
    while (s.energy > 0 && s.status === 'playing') {
      const id = chooseGirl(s, smart);
      if (!id) break;
      let { state, convo } = startConversation(s, id);
      while (convo.status === 'active') {
        const opt = picker(state, convo, brain);
        const before = state.girls.find(g => g.id === id)!;
        const mood = before.mood;
        const r = reply(state, convo, opt.id);
        // Learn the style's value from the reaction, minus the known mood effect and extras.
        if (!opt.fact && !opt.ref && !opt.gift) brain.learn(id, opt.style, r.result.delta === 0 ? 0 : r.result.delta / BALANCE.styleScale / Math.max(0.15, 1 - before.affinity / BALANCE.damping) - BALANCE.moodWeight * MOOD_MODIFIERS[mood][opt.style]);
        state = r.state; convo = r.convo;
      }
      s = state;
    }
    if (s.status === 'playing') s = nextDay(s).state;
  }
  const sc = score(s);
  return { ...sc, perfect: s.perfect };
}

const games = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 2000);
const ci = process.argv.includes('--ci');
const strategies: [string, Picker, boolean, boolean][] = [
  ...STYLES.map(st => [`always ${st}`, singleStyle(st), false, true] as [string, Picker, boolean, boolean]),
  ['random', randomPicker, false, true],
  ['mood-aware', moodAware, true, false],
  ['adaptive (mood + taste + memory)', adaptive, true, false],
];

console.log(`\n${games} games per strategy, ${BALANCE.maxDays} days, ${BALANCE.energyPerDay} conversations/day, 5 girls\n`);
console.log('| Strategy | Avg score | Avg crushes (of 5) | Avg likes+ | Avg blocked | Perfect runs |');
console.log('|---|---:|---:|---:|---:|---:|');
let failed = false;
for (const [name, picker, smart, naive] of strategies) {
  let total = 0, crushes = 0, likes = 0, blocked = 0, perfect = 0;
  for (let i = 0; i < games; i++) {
    const r = play(1000 + i, picker, smart);
    total += r.total; crushes += r.crushes; likes += r.likes; blocked += r.blocked; perfect += r.perfect ? 1 : 0;
  }
  const pct = (perfect / games) * 100;
  console.log(`| ${name} | ${(total / games).toFixed(0)} | ${(crushes / games).toFixed(2)} | ${(likes / games).toFixed(2)} | ${(blocked / games).toFixed(2)} | ${pct.toFixed(1)}% |`);
  if (naive && pct > 5) failed = true;
}
if (ci && failed) {
  console.error('\nBalance check failed: a naive strategy wins more than 5% of games.');
  process.exit(1);
}
