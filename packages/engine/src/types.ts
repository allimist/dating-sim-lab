import type { Mood, Outcome, PlayerFactKey, Style, TierId, ShareKind } from '@dsl/content';

export interface MemoryEntry {
  value: string;
  day: number;
}

/**
 * One girl's memory. It lives inside her own GirlState and is never read when
 * talking to another girl. That is what keeps memories separate.
 */
export interface GirlMemory {
  /** What the player told HER about himself. */
  heToldMe: Partial<Record<PlayerFactKey, MemoryEntry>>;
  /** What SHE told the player (her fact key -> fact.thing). */
  iToldHim: Record<string, MemoryEntry>;
}

export interface GirlState {
  id: string;
  affinity: number;
  mood: Mood;
  blocked: boolean;
  blockedSinceDay: number | null;
  apologyDay: number | null;
  /** True after an accepted apology until affinity is back to 0: mistakes hurt more. */
  careful: boolean;
  lastTalkedDay: number | null;
  talkedToday: boolean;
  dayStartAffinity: number;
  conversations: number;
  /** Lines she said recently, so she does not repeat herself. */
  recentLines: string[];
  memory: GirlMemory;
}

export type MissionType = 'cheer_up' | 'birthday' | 'win_back' | 'ignored' | 'weekly';
export type MissionStatus = 'active' | 'done' | 'failed';

export interface Mission {
  id: string;
  type: MissionType;
  girlId: string | null;
  title: string;
  description: string;
  issuedDay: number;
  deadlineDay: number;
  reward: number;
  energyReward: number;
  target: number | null;
  status: MissionStatus;
}

export interface GameState {
  seed: number;
  day: number;
  maxDays: number;
  energy: number;
  energyPerDay: number;
  castSize: number;
  missionPoints: number;
  nextMissionNo: number;
  status: 'playing' | 'over';
  perfect: boolean;
  girls: GirlState[];
  missions: Mission[];
}

export type TurnKind = 'greet' | 'ask' | 'share' | 'about' | 'birthday' | 'close';
export type OptionTag = 'fact' | 'memory' | 'gift';

export interface ReplyOption {
  id: string;
  text: string;
  style: Style;
  tag?: OptionTag;
  /** A fact the player reveals about himself. */
  fact?: { key: PlayerFactKey; value: string };
  /** A reference to something a girl told him. `correct` is false when it belongs to another girl. */
  ref?: { key: string; thing: string; correct: boolean; reply?: string };
  gift?: { value: string; correct: boolean | null };
}

export interface TurnLog {
  turn: number;
  kind: TurnKind;
  herLines: string[];
  option: ReplyOption;
  delta: number;
  outcome: Outcome;
  reaction: string;
}

export interface Conversation {
  girlId: string;
  day: number;
  turn: number;
  plan: TurnKind[];
  herLines: string[];
  options: ReplyOption[];
  total: number;
  status: 'active' | 'ended';
  shareKind: ShareKind;
  sharedFactKey: string | null;
  giftHit: boolean;
  cheeredUp: boolean;
  endReason: 'finished' | 'walked_out' | null;
  goodbye: string | null;
  log: TurnLog[];
}

export type Expression = 'happy' | 'smile' | 'neutral' | 'sad' | 'annoyed' | 'angry';

export interface ReplyResult {
  delta: number;
  outcome: Outcome;
  reaction: string;
  affinity: number;
  tier: TierId;
  expression: Expression;
  ended: boolean;
  blockedNow: boolean;
  goodbye: string | null;
  completedMissions: Mission[];
}

export interface DaySummaryEntry {
  girlId: string;
  from: number;
  to: number;
  talked: boolean;
  blocked: boolean;
}

export interface DaySummary {
  day: number;
  entries: DaySummaryEntry[];
  failedMissions: Mission[];
  gameOver: boolean;
}

export class GameError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
