import { GIRLS } from './girls';
import { PLAYER_FACT_VALUES } from './dialogue';
import { STYLES, MOODS, type GirlDef, type HerFact, type HairStyle, type Bangs, type Style, type Mood } from './types';

/** Small seeded PRNG (mulberry32). Shared by content generation and the engine. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
    shuffle: <T>(list: readonly T[]): T[] => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

/** Stable 32-bit hash of any parts, used to derive deterministic seeds. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const NAMES = ['Shira', 'Tamar', 'Yael', 'Roni', 'Michal', 'Gal', 'Adi', 'Inbar', 'Hila', 'Keren', 'Lior', 'Talia', 'Eden', 'Avigail', 'Rotem', 'Meital', 'Shani', 'Neta', 'Ella', 'Mia', 'Zoe', 'Lena', 'Clara', 'Nina', 'Ava', 'Iris', 'Luna', 'Daria', 'Vera', 'Alma'];
const JOBS = ['Architect', 'Barista', 'Photographer', 'Vet', 'Dancer', 'Data analyst', 'Chef', 'Teacher', 'Journalist', 'Physiotherapist', 'Florist', 'UX designer', 'Pilot', 'Pharmacist', 'Tattoo artist'];
const CITIES = ['Tel Aviv', 'Haifa', 'Jerusalem', 'Eilat', 'Jaffa', 'Herzliya', 'Netanya', 'Ramat Gan'];
const SKINS = ['#f5d0b5', '#f1c7a5', '#e8b48c', '#d9a07a', '#c98e68', '#a96f4f', '#8d5a3b', '#6b4229'];
const HAIRS = ['#111111', '#3b2219', '#5a3220', '#8e2b2b', '#c9963b', '#e3c47a', '#6b4a2f', '#2c1b47'];
const EYES = ['#2e2e2e', '#5b3a1e', '#3f7d5a', '#2f5d8a', '#4a2c17', '#6a7f8f'];
const LIPS = ['#c46a6a', '#d9707a', '#a8323e', '#b5574f', '#c2185b', '#b06a5b'];
const TOPS = ['#7aa874', '#f2a65a', '#2f3e5c', '#4bb3a8', '#222222', '#9b5de5', '#e76f51', '#457b9d'];
const BGS = ['#fde2e4', '#fff1c1', '#e3e8f8', '#d9f2ee', '#f3e1f5', '#e2f0cb', '#ffe5d9', '#dfe7fd'];
const HAIR_STYLES: HairStyle[] = ['long', 'bob', 'ponytail', 'curly', 'bun', 'wavy'];
const BANGS: Bangs[] = ['none', 'straight', 'side', 'middle'];
const GIFTS = ['peonies', 'a scented candle', 'macarons', 'a polaroid camera', 'a silk scarf', 'a novel', 'lavender', 'a succulent', 'a jazz record', 'chocolate truffles'];
const PET_NAMES = ['Pita', 'Shoko', 'Luna', 'Kiwi', 'Mango', 'Bisli', 'Pixel', 'Ziggy'];
const PETS = ['cat', 'dog', 'rabbit', 'turtle'];
const RELATIVES = [['sister', 'Hadar'], ['brother', 'Itai'], ['grandpa', 'Moshe'], ['best friend', 'Rina'], ['cousin', 'Ofek']];
const DREAMS = ['open a small bakery', 'sail to Greece', 'learn to fly a plane', 'run a half marathon', 'live in Paris for a year', 'adopt a dog from every shelter'];

function factTemplates(r: Rng, gift: string): HerFact[] {
  const petName = r.pick(PET_NAMES);
  const pet = r.pick(PETS);
  const [rel, relName] = r.pick(RELATIVES);
  const dream = r.pick(DREAMS);
  return [
    { key: 'pet', thing: petName, label: `Has a ${pet} named ${petName}`, share: `I have a ${pet} named ${petName}. Total diva 😅`, ask: `How is ${petName} doing?`, reply: `${petName} is great! You remembered 😊` },
    { key: 'family', thing: relName, label: `Close to her ${rel} ${relName}`, share: `My ${rel} ${relName} is my favourite person. We talk every day.`, ask: `How is your ${rel} ${relName}?`, reply: `${relName} is good! Thanks for asking 💛` },
    { key: 'dream', thing: dream, label: `Dreams to ${dream}`, share: `Can I tell you a dream? I want to ${dream} one day.`, ask: `Still planning to ${dream}?`, reply: 'Yes! You actually remembered 🥹' },
    { key: 'favorite', thing: gift, label: `Loves ${gift}`, share: `Small thing about me: I love ${gift}.`, ask: `Gotten any ${gift.replace(/^an? /, '')} lately?`, reply: 'Haha no, but you remembered! 😊' },
  ];
}

/** Deterministically generates girl #index (0-based). The first five are the hand-tuned GIRLS. */
export function generateGirl(index: number): GirlDef {
  if (index < GIRLS.length) return GIRLS[index];
  const r = rng(hashSeed('girl', index));
  const name = NAMES[(index - GIRLS.length) % NAMES.length] + (index - GIRLS.length >= NAMES.length ? ` ${String.fromCharCode(65 + Math.floor((index - GIRLS.length) / NAMES.length) - 1)}.` : '');
  // Personality: two loved styles, one hated, the rest mild.
  const order = r.shuffle(STYLES);
  const styles = Object.fromEntries(STYLES.map(s => [s, r.int(-1, 1)])) as Record<Style, number>;
  styles[order[0]] = 3; styles[order[1]] = 2; styles[order[5]] = -3;
  const moodBias = Object.fromEntries(MOODS.map(m => [m, 0.5 + r.next()])) as Record<Mood, number>;
  const allValues = Object.values(PLAYER_FACT_VALUES).flat();
  const shuffled = r.shuffle(allValues);
  const gift = r.pick(GIFTS);
  return {
    id: `g${index + 1}`,
    name,
    age: r.int(21, 34),
    city: r.pick(CITIES),
    job: r.pick(JOBS),
    bio: `Loves ${order[0] === 'funny' ? 'people who make her laugh' : order[0] === 'deep' ? 'real conversations' : order[0] === 'flirty' ? 'a bit of romance' : order[0] === 'nice' ? 'kindness' : order[0] === 'confident' ? 'people who know what they want' : 'big energy'}. Can't stand ${order[5] === 'confident' ? 'arrogance' : order[5] === 'flirty' ? 'cheesy lines' : order[5] === 'funny' ? 'clowns' : order[5] === 'deep' ? 'heavy talks' : order[5] === 'nice' ? 'boring niceness' : 'show-offs'}.`,
    face: {
      seed: hashSeed('face', index),
      skin: r.pick(SKINS), hair: r.pick(HAIRS), hairStyle: r.pick(HAIR_STYLES), bangs: r.pick(BANGS),
      eyes: r.pick(EYES), lips: r.pick(LIPS), top: r.pick(TOPS), bg: r.pick(BGS),
      glasses: r.chance(0.2), earrings: r.chance(0.5), freckles: r.chance(0.25), mole: r.chance(0.15),
    },
    styles,
    moodBias,
    likes: shuffled.slice(0, 5),
    dislikes: shuffled.slice(5, 8),
    facts: factTemplates(r, gift),
    favoriteGift: gift,
    birthdayDay: r.int(2, 29),
    forgiveness: Math.round((0.3 + r.next() * 0.5) * 100) / 100,
    voice: {},
  };
}

/** The cast for a game: the first `count` girls (5 to start, up to 100). */
export function cast(count: number): GirlDef[] {
  return Array.from({ length: Math.max(1, Math.min(100, count)) }, (_, i) => generateGirl(i));
}
