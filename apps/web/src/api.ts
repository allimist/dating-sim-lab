import type { FaceSpec, Mood, Style } from '@dsl/content';

export type Expression = 'happy' | 'smile' | 'neutral' | 'sad' | 'annoyed' | 'angry';
export type Tier = 'blocked' | 'dislikes' | 'neutral' | 'likes' | 'crush';

export interface Girl {
  id: string; name: string; age: number; city: string; job: string; bio: string; face: FaceSpec;
  mood: Mood; moodEmoji: string; affinity: number; tier: Tier; tierLabel: string;
  blocked: boolean; careful: boolean; talkedToday: boolean; lastTalkedDay: number | null; conversations: number;
  canApologize: boolean; apologyAvailableDay: number | null; expression: Expression; birthdayToday: boolean;
}

export interface Mission {
  id: string; type: string; girlId: string | null; title: string; description: string;
  issuedDay: number; deadlineDay: number; reward: number; energyReward: number; status: 'active' | 'done' | 'failed';
}

export interface Score { total: number; affinity: number; missionPoints: number; crushes: number; likes: number; blocked: number; perfectBonus: number }

export interface DaySummary {
  day: number; gameOver: boolean; failedMissions: Mission[];
  entries: { girlId: string; name: string; from: number; to: number; change: number; talked: boolean; blocked: boolean }[];
}

export interface Game {
  id: number; day: number; maxDays: number; energy: number; energyPerDay: number; status: 'playing' | 'over'; perfect: boolean;
  castSize: number; score: Score; girls: Girl[]; missions: Mission[]; activeConversationId: number | null;
  lastSummary: DaySummary | null; hints: Record<Mood, string>; styles: Record<Style, { label: string; emoji: string }>;
}

export interface Message { from: 'her' | 'me'; text: string; style?: Style; delta?: number; outcome?: string }
export interface Option { id: string; text: string; style: Style; tag: 'fact' | 'memory' | 'gift' | null }

export interface ConversationView {
  id: number; girl: Girl; status: 'active' | 'ended'; turn: number; turns: number; total: number;
  endReason: 'finished' | 'walked_out' | null; messages: Message[]; options: Option[]; expression: Expression;
}

export interface ReplyResult {
  delta: number; outcome: string; reaction: string; affinity: number; tier: Tier; expression: Expression;
  ended: boolean; blockedNow: boolean; goodbye: string | null; completedMissions: Mission[];
}

export interface Profile extends Girl {
  sheKnows: { key: string; text: string; day: number }[];
  youKnow: { key: string; text: string; day: number }[];
  unknownTopics: string[];
  history: { day: number; total: number; turns: { her: string[]; me: string; style: Style; reaction: string; delta: number }[] }[];
}

export interface User { id: number; email: string; name: string }

const TOKEN_KEY = 'dsl-token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? `Request failed (${res.status})`);
  return data as T;
}
