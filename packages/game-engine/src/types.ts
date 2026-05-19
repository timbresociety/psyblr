export const PLAYER_IDS = ['player1', 'player2'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const SUITS = ['spades', 'clubs', 'hearts', 'diamonds'] as const;

export type PlayerId = (typeof PLAYER_IDS)[number];
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type CardColor = 'black' | 'red';
export type Role = 'attack' | 'defense';
export type Winner = PlayerId | 'draw';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  color: CardColor;
  value: number;
  shortLabel: string;
  displayLabel: string;
  suitSymbol: string;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: CardColor;
  poolCardIds: string[];
  selectedCardIds: string[];
  handCardIds: string[];
  spent: number;
  startingSpend: number;
  score: number;
  wicketed: boolean;
}

export interface RoundRecord {
  roundNumber: number;
  attacker: PlayerId;
  defender: PlayerId;
  attackCardId: string;
  defenseCardId: string;
  attackCardValue: number;
  defenseCardValue: number;
  attackRank: Rank;
  defenseRank: Rank;
  pointsScored: number;
  wicket: boolean;
  attackerWicketedAfterRound: boolean;
  scoresAfterRound: Record<PlayerId, number>;
}

export interface PendingRoundResolution {
  players: Record<PlayerId, PlayerState>;
  record: RoundRecord;
  winner: Winner | null;
}

export type PhaseTarget =
  | { type: 'setup'; player: PlayerId }
  | { type: 'play'; player: PlayerId }
  | { type: 'buy'; player: PlayerId }
  | { type: 'round-result' }
  | { type: 'starting-totals' }
  | { type: 'game-over' };

export type GamePhase =
  | { type: 'setup'; player: PlayerId }
  | { type: 'pass'; title: string; message: string; next: PhaseTarget }
  | { type: 'starting-totals' }
  | { type: 'play'; player: PlayerId; role: Role; roundNumber: number }
  | { type: 'round-result'; roundNumber: number; result: RoundRecord }
  | { type: 'buy'; player: PlayerId; roundNumber: number }
  | { type: 'game-over' };

export interface GameState {
  deck: Card[];
  cardsById: Record<string, Card>;
  players: Record<PlayerId, PlayerState>;
  currentRound: number;
  startingTotalsRevealed: boolean;
  pendingRoundCardIds: Partial<Record<PlayerId, string>>;
  pendingRoundResolution: PendingRoundResolution | null;
  history: RoundRecord[];
  phase: GamePhase;
  winner: Winner | null;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export type GameAction =
  | { type: 'restart' }
  | { type: 'advance-pass' }
  | { type: 'acknowledge-starting-totals' }
  | { type: 'advance-after-round' }
  | { type: 'confirm-setup'; player: PlayerId; cardIds: string[] }
  | { type: 'confirm-play'; player: PlayerId; cardId: string }
  | { type: 'confirm-buy'; player: PlayerId; cardId: string };
