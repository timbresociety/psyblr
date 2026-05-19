import {
  PLAYER_IDS,
  STARTING_CARD_COUNT,
  TOTAL_BUDGET,
  buildCardLookup,
  buildDeck,
  getAttackerForRound,
  getDefenderForRound,
  getPlayerPool,
  type PlayerId,
} from '@psyblr/game-engine';
import { ABANDONED_ROOM_TIMEOUT_MS } from '../config';
import type { LobbyStateEvent, PrivateStateEvent } from '../messages';
import type {
  LockedChoiceState,
  PublicMatchStateView,
  PrivatePlayerStateView,
  PublicPlayerStateView,
  RoomPlayerState,
  RoomState,
} from '../types';

const PLAYER_COLORS: Record<PlayerId, 'black' | 'red'> = {
  player1: 'black',
  player2: 'red',
};

const DEFAULT_NAMES: Record<PlayerId, string> = {
  player1: 'Player 1',
  player2: 'Player 2',
};

export const ROOM_DECK = buildDeck();
export const ROOM_CARDS_BY_ID = buildCardLookup(ROOM_DECK);

function getFutureIso(baseDate: Date, deltaMs: number): string {
  return new Date(baseDate.getTime() + deltaMs).toISOString();
}

export function createLockedChoiceState(): LockedChoiceState {
  return {
    startingHands: {},
    roundCards: {},
    replenishments: {},
    nextPhaseReady: {},
  };
}

export function createRoomPlayerState(playerId: PlayerId, displayName: string, sessionToken: string): RoomPlayerState {
  const normalizedName = displayName.trim() || DEFAULT_NAMES[playerId];
  const poolCardIds = getPlayerPool(ROOM_DECK, playerId).map((card) => card.id);
  const nowIso = new Date().toISOString();

  return {
    id: playerId,
    name: normalizedName,
    displayName: normalizedName,
    color: PLAYER_COLORS[playerId],
    sessionToken,
    connected: false,
    disconnectedAt: nowIso,
    ready: false,
    joinedAt: nowIso,
    spent: 0,
    budgetRemaining: TOTAL_BUDGET,
    startingSpend: 0,
    score: 0,
    wicketed: false,
    poolCardIds,
    selectedCardIds: [],
    handCardIds: [],
    startingHandCardIds: [],
    replenishmentCardIds: [],
    remainingPoolCardIds: [...poolCardIds],
  };
}

export function createRoomState(roomCode: string, hostName: string, sessionToken: string): RoomState {
  const createdAt = new Date();
  const roomState: RoomState = {
    roomCode,
    createdAt: createdAt.toISOString(),
    lastActivityAt: createdAt.toISOString(),
    abandonmentExpiresAt: null,
    phase: 'lobby',
    roundNumber: 1,
    attacker: getAttackerForRound(1),
    defender: getDefenderForRound(1),
    openingSpendRevealed: false,
    players: {
      player1: createRoomPlayerState('player1', hostName, sessionToken),
    },
    discardHistory: [],
    lockedChoices: createLockedChoiceState(),
    winner: null,
  };

  ensureRoomAbandonmentDeadline(roomState, createdAt);
  return roomState;
}

export function getJoinedPlayerIds(roomState: RoomState): PlayerId[] {
  return PLAYER_IDS.filter((playerId) => Boolean(roomState.players[playerId]));
}

export function getJoinedPlayers(roomState: RoomState): RoomPlayerState[] {
  return getJoinedPlayerIds(roomState)
    .map((playerId) => roomState.players[playerId])
    .filter((player): player is RoomPlayerState => Boolean(player));
}

export function hasConnectedPlayers(roomState: RoomState): boolean {
  return getJoinedPlayers(roomState).some((player) => player.connected);
}

export function areBothPlayersPresent(roomState: RoomState): boolean {
  return getJoinedPlayers(roomState).length === PLAYER_IDS.length;
}

export function areBothPlayersReady(roomState: RoomState): boolean {
  return areBothPlayersPresent(roomState) && getJoinedPlayers(roomState).every((player) => player.ready);
}

export function areAllPhaseReady(roomState: RoomState): boolean {
  return getJoinedPlayerIds(roomState).every((playerId) => roomState.lockedChoices.nextPhaseReady[playerId] === true);
}

export function createPublicPlayerStateView(roomState: RoomState, playerId: PlayerId): PublicPlayerStateView | null {
  const player = roomState.players[playerId];

  if (!player) {
    return null;
  }

  return {
    id: player.id,
    displayName: player.displayName,
    color: player.color,
    connected: player.connected,
    ready: player.ready,
    score: player.score,
    wicketed: player.wicketed,
    selectedCount: player.selectedCardIds.length,
    startingSpend: roomState.openingSpendRevealed ? player.startingSpend : null,
  };
}

export function createPublicMatchStateView(roomState: RoomState): PublicMatchStateView {
  return {
    roomCode: roomState.roomCode,
    phase: roomState.phase,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender,
    openingSpendRevealed: roomState.openingSpendRevealed,
    winner: roomState.winner,
    discardHistory: [...roomState.discardHistory],
    players: PLAYER_IDS.map((playerId) => createPublicPlayerStateView(roomState, playerId)).filter(
      (player): player is PublicPlayerStateView => Boolean(player),
    ),
  };
}

export function createLobbyStateEvent(roomState: RoomState): LobbyStateEvent {
  return {
    type: 'lobby_state',
    state: createPublicMatchStateView(roomState),
  };
}

function getCurrentLockedChoice(roomState: RoomState, playerId: PlayerId): string | string[] | null {
  switch (roomState.phase) {
    case 'setup':
    case 'opening-reveal':
      return roomState.lockedChoices.startingHands[playerId] ?? null;
    case 'round':
    case 'round-reveal':
    case 'finished':
      return roomState.lockedChoices.roundCards[playerId] ?? null;
    case 'replenishment':
    case 'replenishment-reveal':
      return roomState.lockedChoices.replenishments[playerId] ?? null;
    case 'lobby':
      return null;
  }
}

export function createPrivatePlayerStateView(roomState: RoomState, playerId: PlayerId): PrivatePlayerStateView {
  const player = roomState.players[playerId];

  if (!player) {
    throw new Error(`Player ${playerId} is not registered in room ${roomState.roomCode}.`);
  }

  return {
    phase: roomState.phase,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender,
    spent: player.spent,
    budgetRemaining: player.budgetRemaining,
    startingSpend: player.startingSpend,
    score: player.score,
    wicketed: player.wicketed,
    selectedCardIds: [...player.selectedCardIds],
    handCardIds: [...player.handCardIds],
    startingHandCardIds: [...player.startingHandCardIds],
    replenishmentCardIds: [...player.replenishmentCardIds],
    remainingPoolCardIds: [...player.remainingPoolCardIds],
    currentLockedChoice: getCurrentLockedChoice(roomState, playerId),
  };
}

export function createPrivateStateEvent(roomState: RoomState, playerId: PlayerId): PrivateStateEvent {
  return {
    type: 'private_state',
    roomCode: roomState.roomCode,
    playerId,
    state: createPrivatePlayerStateView(roomState, playerId),
  };
}

export function markRoomActivity(roomState: RoomState, now: Date = new Date()): void {
  roomState.lastActivityAt = now.toISOString();
}

export function clearRoomAbandonmentDeadline(roomState: RoomState): void {
  roomState.abandonmentExpiresAt = null;
}

export function ensureRoomAbandonmentDeadline(roomState: RoomState, now: Date = new Date()): string {
  if (hasConnectedPlayers(roomState)) {
    roomState.abandonmentExpiresAt = null;
    return '';
  }

  const existingTimestamp = roomState.abandonmentExpiresAt ? Date.parse(roomState.abandonmentExpiresAt) : Number.NaN;
  if (Number.isFinite(existingTimestamp) && existingTimestamp > now.getTime()) {
    return roomState.abandonmentExpiresAt!;
  }

  const deadline = getFutureIso(now, ABANDONED_ROOM_TIMEOUT_MS);
  roomState.abandonmentExpiresAt = deadline;
  return deadline;
}

export function isRoomExpired(roomState: RoomState, now: Date = new Date()): boolean {
  if (!roomState.abandonmentExpiresAt) {
    return false;
  }

  return Date.parse(roomState.abandonmentExpiresAt) <= now.getTime();
}

export function updatePlayerConnectionState(
  roomState: RoomState,
  playerId: PlayerId,
  connected: boolean,
  now: Date = new Date(),
): void {
  const player = roomState.players[playerId];
  if (!player) {
    return;
  }

  player.connected = connected;
  player.disconnectedAt = connected ? null : now.toISOString();
  markRoomActivity(roomState, now);

  if (hasConnectedPlayers(roomState)) {
    clearRoomAbandonmentDeadline(roomState);
    return;
  }

  ensureRoomAbandonmentDeadline(roomState, now);
}

export function clearPhaseReadyState(roomState: RoomState): void {
  roomState.lockedChoices.nextPhaseReady = {};
}

export function resetRoundLocks(roomState: RoomState): void {
  roomState.lockedChoices.roundCards = {};
}

export function resetReplenishmentLocks(roomState: RoomState): void {
  roomState.lockedChoices.replenishments = {};
}

export function getOpeningSpends(roomState: RoomState): Record<PlayerId, number> {
  return {
    player1: roomState.players.player1?.startingSpend ?? 0,
    player2: roomState.players.player2?.startingSpend ?? 0,
  };
}

export function getScoreRecord(roomState: RoomState): Record<PlayerId, number> {
  return {
    player1: roomState.players.player1?.score ?? 0,
    player2: roomState.players.player2?.score ?? 0,
  };
}

export function normalizePlayerName(playerId: PlayerId, displayName?: string): string {
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_NAMES[playerId];
}

export function isStartingHandComplete(cardIds: string[]): boolean {
  return cardIds.length === STARTING_CARD_COUNT;
}
