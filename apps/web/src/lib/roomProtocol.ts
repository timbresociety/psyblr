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

export interface CreateRoomMessage {
  type: 'create_room';
  displayName?: string;
}

export interface JoinRoomMessage {
  type: 'join_room';
  roomCode: string;
  displayName?: string;
}

export interface ResumeRoomMessage {
  type: 'resume_room';
  roomCode: string;
  playerId: PlayerId;
  sessionToken: string;
}

export interface PlayerReadyMessage {
  type: 'player_ready';
  ready: boolean;
}

export interface SubmitStartingHandMessage {
  type: 'submit_starting_hand';
  cardIds: string[];
}

export interface LockRoundCardMessage {
  type: 'lock_round_card';
  cardId: string;
}

export interface BuyReplenishmentCardMessage {
  type: 'buy_replenishment_card';
  cardId: string;
}

export interface NextPhaseReadyMessage {
  type: 'next_phase_ready';
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | ResumeRoomMessage
  | PlayerReadyMessage
  | SubmitStartingHandMessage
  | LockRoundCardMessage
  | BuyReplenishmentCardMessage
  | NextPhaseReadyMessage;

export interface RoomCreatedEvent {
  type: 'room_created';
  roomCode: string;
  playerId: PlayerId;
  sessionToken: string;
  websocketPath: string;
  phase: RoomPhase;
}

export interface RoomJoinedEvent {
  type: 'room_joined';
  roomCode: string;
  playerId: PlayerId;
  sessionToken: string;
  websocketPath: string;
  phase: RoomPhase;
}

export interface RoomResumedEvent {
  type: 'room_resumed';
  roomCode: string;
  playerId: PlayerId;
  sessionToken: string;
  websocketPath: string;
  phase: RoomPhase;
}

export interface LobbyStateEvent {
  type: 'lobby_state';
  state: PublicMatchStateView;
}

export interface SetupStartedEvent {
  type: 'setup_started';
  roomCode: string;
  roundNumber: number;
  startingCardCount: number;
}

export interface OpeningSpendRevealedEvent {
  type: 'opening_spend_revealed';
  roomCode: string;
  spends: Record<PlayerId, number>;
}

export interface RoundStartedEvent {
  type: 'round_started';
  roomCode: string;
  roundNumber: number;
  attacker: PlayerId;
  defender: PlayerId;
}

export interface RoundResolvedEvent {
  type: 'round_resolved';
  roomCode: string;
  round: RoundRecord;
  discardCount: number;
}

export interface ReplenishmentStartedEvent {
  type: 'replenishment_started';
  roomCode: string;
  afterRound: number;
}

export interface ReplenishmentResolvedEvent {
  type: 'replenishment_resolved';
  roomCode: string;
  afterRound: number;
  nextRound: number;
}

export interface MatchFinishedEvent {
  type: 'match_finished';
  roomCode: string;
  winner: Winner;
  scores: Record<PlayerId, number>;
}

export interface PrivateStateEvent {
  type: 'private_state';
  roomCode: string;
  playerId: PlayerId;
  state: PrivatePlayerStateView;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type ServerEvent =
  | RoomCreatedEvent
  | RoomJoinedEvent
  | RoomResumedEvent
  | LobbyStateEvent
  | SetupStartedEvent
  | OpeningSpendRevealedEvent
  | RoundStartedEvent
  | RoundResolvedEvent
  | ReplenishmentStartedEvent
  | ReplenishmentResolvedEvent
  | MatchFinishedEvent
  | PrivateStateEvent
  | ErrorEvent;
