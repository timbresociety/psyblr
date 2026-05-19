import type { CardColor, PlayerId, RoundRecord, Winner } from '@psyblr/game-engine';

export type RoomPhase =
  | 'lobby'
  | 'setup'
  | 'opening-reveal'
  | 'round'
  | 'round-reveal'
  | 'replenishment'
  | 'replenishment-reveal'
  | 'finished';

export interface RoomPlayerState {
  id: PlayerId;
  name: string;
  displayName: string;
  color: CardColor;
  sessionToken: string;
  connected: boolean;
  disconnectedAt: string | null;
  ready: boolean;
  joinedAt: string;
  spent: number;
  budgetRemaining: number;
  startingSpend: number;
  score: number;
  wicketed: boolean;
  poolCardIds: string[];
  selectedCardIds: string[];
  handCardIds: string[];
  startingHandCardIds: string[];
  replenishmentCardIds: string[];
  remainingPoolCardIds: string[];
}

export interface LockedChoiceState {
  startingHands: Partial<Record<PlayerId, string[]>>;
  roundCards: Partial<Record<PlayerId, string>>;
  replenishments: Partial<Record<PlayerId, string>>;
  nextPhaseReady: Partial<Record<PlayerId, boolean>>;
}

export interface RoomState {
  roomCode: string;
  createdAt: string;
  lastActivityAt: string;
  abandonmentExpiresAt: string | null;
  phase: RoomPhase;
  roundNumber: number;
  attacker: PlayerId;
  defender: PlayerId;
  openingSpendRevealed: boolean;
  players: Partial<Record<PlayerId, RoomPlayerState>>;
  discardHistory: RoundRecord[];
  lockedChoices: LockedChoiceState;
  winner: Winner | null;
}

export interface PublicPlayerStateView {
  id: PlayerId;
  displayName: string;
  color: CardColor;
  connected: boolean;
  ready: boolean;
  score: number;
  wicketed: boolean;
  selectedCount: number;
  startingSpend: number | null;
}

export interface PublicMatchStateView {
  roomCode: string;
  phase: RoomPhase;
  roundNumber: number;
  attacker: PlayerId;
  defender: PlayerId;
  openingSpendRevealed: boolean;
  winner: Winner | null;
  discardHistory: RoundRecord[];
  players: PublicPlayerStateView[];
}

export interface PrivatePlayerStateView {
  phase: RoomPhase;
  roundNumber: number;
  attacker: PlayerId;
  defender: PlayerId;
  spent: number;
  budgetRemaining: number;
  startingSpend: number;
  score: number;
  wicketed: boolean;
  selectedCardIds: string[];
  handCardIds: string[];
  startingHandCardIds: string[];
  replenishmentCardIds: string[];
  remainingPoolCardIds: string[];
  currentLockedChoice: string | string[] | null;
}
