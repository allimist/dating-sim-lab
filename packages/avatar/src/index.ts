/**
 * Procedural SVG faces. Every girl gets a unique face from her FaceSpec (or just a seed),
 * and six expressions so the face reacts live during a conversation.
 * No image files: everything is drawn with paths, so it scales to 100+ girls.
 */
import type { FaceSpec, HairStyle, Bangs } from '@dsl/content';
import { rng } from '@dsl/content';

export type Expression = 'happy' | 'smile' | 'neutral' | 'sad' | 'annoyed' | 'angry';
export const EXPRESSIONS: Expression[] = ['happy', 'smile', 'neutral', 'sad', 'annoyed', 'angry'];

const SKINS = ['#f5d0b5', '#f1c7a5', '#e8b48c', '#d9a07a', '#c98e68', '#a96f4f', '#8d5a3b'];
const HAIRS = ['#111111', '#3b2219', '#5a3220', '#8e2b2b', '#c9963b', '#e3c47a'];
const EYES = ['#2e2e2e', '#5b3a1e', '#3f7d5a', '#2f5d8a'];
const LIPS = ['#c46a6a', '#d9707a', '#a8323e', '#b5574f'];
const TOPS = ['#7aa874', '#f2a65a', '#2f3e5c', '#4bb3a8', '#9b5de5'];
const BGS = ['#fde2e4', '#fff1c1', '#e3e8f8', '#d9f2ee', '#f3e1f5'];
const HAIR_STYLES: HairStyle[] = ['long', 'bob', 'ponytail', 'curly', 'bun', 'wavy'];
const BANGS: Bangs[] = ['none', 'straight', 'side', 'middle'];

/** Fills any missing face parts deterministically from the seed. */
export function resolveFace(spec: FaceSpec): Required<FaceSpec> {
  const r = rng(spec.seed);
  return {
    seed: spec.seed,
    skin: spec.skin ?? r.pick(SKINS),
    hair: spec.hair ?? r.pick(HAIRS),
    hairStyle: spec.hairStyle ?? r.pick(HAIR_STYLES),
    bangs: spec.bangs ?? r.pick(BANGS),
    eyes: spec.eyes ?? r.pick(EYES),
    lips: spec.lips ?? r.pick(LIPS),
    top: spec.top ?? r.pick(TOPS),
    bg: spec.bg ?? r.pick(BGS),
    // A hand-written spec (one with a skin colour) means unset accessories are off, not random.
    glasses: spec.glasses ?? (spec.skin === undefined && r.chance(0.2)),
    earrings: spec.earrings ?? (spec.skin === undefined && r.chance(0.5)),
    freckles: spec.freckles ?? (spec.skin === undefined && r.chance(0.2)),
    mole: spec.mole ?? (spec.skin === undefined && r.chance(0.15)),
  };
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function hairBack(style: HairStyle, c: string) {
  switch (style) {
    case 'long':
      return `<path d="M52 98 C40 30 160 30 148 98 C152 140 160 175 166 200 L34 200 C40 175 48 140 52 98 Z" fill="${c}"/>`;
    case 'wavy':
      return `<path d="M52 98 C40 30 160 30 148 98 C156 118 146 132 156 150 C164 166 150 178 160 196 L40 196 C50 178 36 166 44 150 C54 132 44 118 52 98 Z" fill="${c}"/>`;
    case 'bob':
      return `<path d="M50 104 C42 34 158 34 150 104 C152 122 152 136 148 146 C130 152 70 152 52 146 C48 136 48 122 50 104 Z" fill="${c}"/>`;
    case 'ponytail':
      return `<path d="M54 96 C46 36 154 36 146 96 Z" fill="${c}"/><path d="M140 60 C178 64 176 120 160 160 C156 132 150 104 138 82 Z" fill="${c}"/><circle cx="142" cy="66" r="6" fill="${shade(c, 0.35)}"/>`;
    case 'curly': {
      const pts = [[60, 60], [80, 44], [100, 40], [120, 44], [140, 60], [150, 82], [154, 106], [150, 128], [46, 82], [44, 106], [50, 128], [64, 138], [136, 138]];
      return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${c}"/>`).join('');
    }
    case 'bun':
      return `<circle cx="100" cy="36" r="20" fill="${c}"/><path d="M54 96 C46 40 154 40 146 96 Z" fill="${c}"/>`;
  }
}

function hairFront(bangs: Bangs, style: HairStyle, c: string) {
  const hi = shade(c, 0.18);
  let d: string;
  switch (bangs) {
    case 'straight':
      d = 'M56 94 C50 38 150 38 144 94 C142 82 139 76 134 74 L66 74 C61 76 58 82 56 94 Z';
      break;
    case 'side':
      d = 'M56 98 C48 36 152 34 144 94 C136 70 114 62 90 72 C76 78 64 86 56 98 Z';
      break;
    case 'middle':
      d = 'M56 100 C50 40 150 40 144 100 C140 74 118 62 100 58 C82 62 60 74 56 100 Z';
      break;
    default:
      d = 'M57 88 C54 44 146 44 143 88 C132 64 68 64 57 88 Z';
  }
  const curls = style === 'curly' ? [[70, 58], [100, 50], [130, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/>`).join('') : '';
  return `<path d="${d}" fill="${c}"/>${curls}<path d="M78 56 C90 50 110 50 122 56" stroke="${hi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
}

function eye(cx: number, f: Required<FaceSpec>, ex: Expression, left: boolean) {
  const y = 98;
  const lash = '#2a1a14';
  if (ex === 'happy') {
    return `<path d="M${cx - 8} ${y + 1} Q${cx} ${y - 7} ${cx + 8} ${y + 1}" stroke="${lash}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }
  const ry = ex === 'angry' ? 4 : ex === 'annoyed' ? 4.6 : 5.6;
  const outer = left ? cx - 9 : cx + 9;
  const flick = left ? cx - 12 : cx + 12;
  let s = `<ellipse cx="${cx}" cy="${y}" rx="8.5" ry="${ry}" fill="#fff"/>`;
  s += `<circle cx="${cx}" cy="${y + 0.5}" r="4.3" fill="${f.eyes}"/><circle cx="${cx}" cy="${y + 0.5}" r="2.1" fill="#111"/><circle cx="${cx + 1.6}" cy="${y - 1.2}" r="1.2" fill="#fff"/>`;
  if (ex === 'annoyed') s += `<path d="M${cx - 9} ${y - 6} L${cx + 9} ${y - 6} L${cx + 9} ${y - 0.5} L${cx - 9} ${y - 0.5} Z" fill="${f.skin}"/>`;
  s += `<path d="M${cx - 9} ${y - (ex === 'annoyed' ? 0.5 : 1)} Q${cx} ${y - ry - 3} ${cx + 9} ${y - (ex === 'annoyed' ? 0.5 : 1)}" stroke="${lash}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${outer} ${y - 2} L${flick} ${y - 5}" stroke="${lash}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (ex === 'sad' && left) s += `<path d="M${cx - 6} ${y + 8} q-3 6 0 8 q3 -2 0 -8 Z" fill="#8fd3ff" opacity=".9"/>`;
  return s;
}

function brows(f: Required<FaceSpec>, ex: Expression) {
  const c = shade(f.hair, f.hair === '#111111' ? 0 : -0.25);
  const paths: Record<Expression, [string, string]> = {
    happy: ['M73 84 Q82 78 91 82', 'M109 82 Q118 78 127 84'],
    smile: ['M73 86 Q82 81 91 84', 'M109 84 Q118 81 127 86'],
    neutral: ['M73 86 Q82 83 91 85', 'M109 85 Q118 83 127 86'],
    sad: ['M73 87 Q82 86 91 81', 'M109 81 Q118 86 127 87'],
    annoyed: ['M73 86 L91 86', 'M109 86 L127 86'],
    angry: ['M73 81 Q82 83 91 89', 'M109 89 Q118 83 127 81'],
  };
  return paths[ex].map(d => `<path d="${d}" stroke="${c}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`).join('');
}

function mouth(f: Required<FaceSpec>, ex: Expression) {
  const lips = f.lips;
  switch (ex) {
    case 'happy':
      return `<path d="M86 124 Q100 142 114 124 Q100 128 86 124 Z" fill="#7d2633" stroke="${lips}" stroke-width="2.5" stroke-linejoin="round"/><path d="M89 125.5 Q100 129 111 125.5 L110 128 Q100 131 90 128 Z" fill="#fff"/>`;
    case 'smile':
      return `<path d="M88 125 Q100 135 112 125" stroke="${lips}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'neutral':
      return `<path d="M90 128 Q100 130.5 110 128" stroke="${lips}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'sad':
      return `<path d="M90 132 Q100 124 110 132" stroke="${lips}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'annoyed':
      return `<path d="M91 129.5 L109 127.5" stroke="${lips}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'angry':
      return `<path d="M88 132 Q100 122 112 132 Q100 128 88 132 Z" fill="#7d2633" stroke="${lips}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
}

export interface RenderOptions {
  /** Pixel size; the SVG is square. Omit for a fluid 100% width. */
  size?: number;
  title?: string;
}

/** Renders a face as an SVG string. */
export function renderFace(spec: FaceSpec, ex: Expression = 'neutral', opts: RenderOptions = {}): string {
  const f = resolveFace(spec);
  const skinShadow = shade(f.skin, -0.14);
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : ' width="100%" height="100%"';
  const id = `c${f.seed}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"${size} role="img">`;
  if (opts.title) s += `<title>${opts.title.replace(/[<&>]/g, '')}</title>`;
  s += `<defs><clipPath id="${id}"><circle cx="100" cy="100" r="100"/></clipPath></defs><g clip-path="url(#${id})">`;
  s += `<rect width="200" height="200" fill="${f.bg}"/>`;
  s += hairBack(f.hairStyle, f.hair);
  // Shoulders and top, neck.
  s += `<path d="M26 204 C30 166 66 152 100 152 C134 152 170 166 174 204 Z" fill="${f.top}"/>`;
  s += `<path d="M87 126 L113 126 L114 156 Q100 166 86 156 Z" fill="${skinShadow}"/>`;
  s += `<path d="M86 152 Q100 170 114 152 L112 151 Q100 160 88 151 Z" fill="${f.skin}"/>`;
  // Ears and face.
  s += `<ellipse cx="57" cy="101" rx="7" ry="10" fill="${skinShadow}"/><ellipse cx="143" cy="101" rx="7" ry="10" fill="${skinShadow}"/>`;
  s += `<path d="M57 92 C57 48 143 48 143 92 C143 126 124 149 100 149 C76 149 57 126 57 92 Z" fill="${f.skin}"/>`;
  if (f.earrings) s += `<circle cx="57" cy="114" r="3.2" fill="#e8c35a"/><circle cx="143" cy="114" r="3.2" fill="#e8c35a"/>`;
  // Cheeks.
  if (ex === 'happy' || ex === 'smile') s += `<ellipse cx="74" cy="114" rx="9" ry="4.5" fill="#ff7a8a" opacity=".32"/><ellipse cx="126" cy="114" rx="9" ry="4.5" fill="#ff7a8a" opacity=".32"/>`;
  if (ex === 'angry') s += `<ellipse cx="74" cy="114" rx="10" ry="5" fill="#ff4d4d" opacity=".22"/><ellipse cx="126" cy="114" rx="10" ry="5" fill="#ff4d4d" opacity=".22"/>`;
  if (f.freckles) {
    const r = rng(f.seed + 7);
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      s += `<circle cx="${100 + side * r.int(12, 26)}" cy="${r.int(106, 116)}" r="1.1" fill="${shade(f.skin, -0.35)}" opacity=".7"/>`;
    }
  }
  if (f.mole) s += `<circle cx="116" cy="121" r="1.5" fill="#3a2418"/>`;
  s += eye(82, f, ex, true) + eye(118, f, ex, false);
  s += brows(f, ex);
  s += `<path d="M100 102 Q96.5 112 99 115.5 Q102 117 105 114.5" stroke="${shade(f.skin, -0.3)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s += mouth(f, ex);
  s += hairFront(f.bangs, f.hairStyle, f.hair);
  if (f.glasses) s += `<g stroke="#2b2b2b" stroke-width="2.4" fill="#ffffff" fill-opacity=".12"><circle cx="82" cy="98" r="12"/><circle cx="118" cy="98" r="12"/><path d="M94 97 Q100 93 106 97" fill="none"/><path d="M70 96 L58 93 M130 96 L142 93" fill="none"/></g>`;
  s += `</g></svg>`;
  return s;
}

/** Same face as a data: URL, handy for <img src>. */
export function faceDataUrl(spec: FaceSpec, ex: Expression = 'neutral') {
  return `data:image/svg+xml;utf8,${encodeURIComponent(renderFace(spec, ex, { size: 200 }))}`;
}
