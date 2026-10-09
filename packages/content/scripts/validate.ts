/** Checks that every dialogue combination the engine can ask for has lines. Exit 1 on gaps. */
import {
  STYLES, MOODS, OUTCOMES, PLAYER_FACT_KEYS, PLAYER_FACT_VALUES, HER_QUESTIONS, HER_RECALL_QUESTIONS,
  PLAYER_ANSWERS, CALLBACK_OPENERS, FIRST_OPENERS, OPENERS, GREETING_REPLIES, MOOD_SHARES, SHARE_RESPONSES,
  ASK_HER, CLOSING_REPLIES, REACTIONS, MOOD_MODIFIERS, cast,
} from '../src/index';

const errors: string[] = [];
const need = (ok: unknown, what: string) => { if (!ok || (Array.isArray(ok) && ok.length === 0)) errors.push(what); };

for (const m of MOODS) {
  need(FIRST_OPENERS[m], `FIRST_OPENERS.${m}`);
  need(OPENERS[m]?.cold, `OPENERS.${m}.cold`);
  need(OPENERS[m]?.warm, `OPENERS.${m}.warm`);
  need(MOOD_SHARES[m], `MOOD_SHARES.${m}`);
  for (const s of STYLES) {
    need(GREETING_REPLIES[m]?.[s], `GREETING_REPLIES.${m}.${s}`);
    need(typeof MOOD_MODIFIERS[m]?.[s] === 'number', `MOOD_MODIFIERS.${m}.${s}`);
  }
}
for (const k of PLAYER_FACT_KEYS) {
  need(PLAYER_FACT_VALUES[k]?.length >= 4, `PLAYER_FACT_VALUES.${k} needs >= 4 values`);
  need(HER_QUESTIONS[k], `HER_QUESTIONS.${k}`);
  need(HER_RECALL_QUESTIONS[k], `HER_RECALL_QUESTIONS.${k}`);
  need(CALLBACK_OPENERS[k], `CALLBACK_OPENERS.${k}`);
  for (const s of STYLES) need(PLAYER_ANSWERS[k]?.[s]?.includes('{'), `PLAYER_ANSWERS.${k}.${s}`);
}
for (const kind of ['good', 'bad', 'bored'] as const) for (const s of STYLES) need(SHARE_RESPONSES[kind][s], `SHARE_RESPONSES.${kind}.${s}`);
for (const s of STYLES) { need(ASK_HER[s], `ASK_HER.${s}`); need(CLOSING_REPLIES[s], `CLOSING_REPLIES.${s}`); }
for (const o of OUTCOMES) need(REACTIONS[o], `REACTIONS.${o}`);

const girls = cast(100);
const ids = new Set<string>();
for (const g of girls) {
  if (ids.has(g.id)) errors.push(`duplicate girl id ${g.id}`);
  ids.add(g.id);
  need(g.age >= 21, `${g.id}: age must be 21+`);
  need(g.facts.length >= 3, `${g.id}: needs >= 3 facts`);
  need(g.facts.some(f => f.key === 'favorite' && f.thing === g.favoriteGift), `${g.id}: favourite fact must match favoriteGift`);
  need(g.birthdayDay >= 1 && g.birthdayDay <= 30, `${g.id}: birthday day 1..30`);
  for (const s of STYLES) need(typeof g.styles[s] === 'number', `${g.id}: style ${s}`);
  const keys = g.facts.map(f => f.key);
  need(new Set(keys).size === keys.length, `${g.id}: fact keys must be unique`);
}

if (errors.length) {
  console.error(`Content has ${errors.length} problem(s):\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log(`Content OK: ${MOODS.length} moods × ${STYLES.length} styles, ${PLAYER_FACT_KEYS.length} fact topics, ${girls.length} girls checked.`);
