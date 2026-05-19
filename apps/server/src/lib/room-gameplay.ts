import {
  PLAYER_IDS,
  REPLENISHMENT_ROUNDS,
  STARTING_CARD_COUNT,
  TOTAL_BUDGET,
  TOTAL_ROUNDS,
  getAttackerForRound,
  getDefenderForRound,
  getWinner,
  resolveRound,
  validatePlayableCard,
  validateReplenishmentPurchase,
  validateStartingSelection,
  type PlayerId,
  type RoundRecord,
} from '@psyblr/game-engine';
import type {
  ErrorEvent,
  OpeningSpendRevealedEvent,
  ReplenishmentResolvedEvent,
  RoundResolvedEvent,
  RoundStartedEvent,
  ServerEvent,
  SetupStartedEvent,
} from '../messages';
import {
  areAllPhaseReady,
  areBothPlayersReady,
  clearPhaseReadyState,
  getOpeningSpends,
  getScoreRecord,
  resetReplenishmentLocks,
  resetRoundLocks,
  ROOM_CARDS_BY_ID,
} from './room-state';
import type { RoomPlayerState, RoomState } from '../types';

export interface RoomTransitionSuccess {
  ok: true;
  events: ServerEvent[];
}

export interface RoomTransitionFailure {
  ok: false;
  error: ErrorEvent;
}

export type RoomTransitionResult = RoomTransitionSuccess | RoomTransitionFailure;

function invalid(code: string, message: string): RoomTransitionFailure {
  return {
    ok: false,
    error: {
      type: 'error',
      code,
      message,
    },
  };
}

function success(events: ServerEvent[] = []): RoomTransitionSuccess {
  return {
    ok: true,
    events,
  };
}

function requirePlayer(roomState: RoomState, playerId: PlayerId): RoomPlayerState | null {
  return roomState.players[playerId] ?? null;
}

function createRoundStartedEvent(roomState: RoomState): RoundStartedEvent {
  return {
    type: 'round_started',
    roomCode: roomState.roomCode,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender,
  };
}

function createSetupStartedEvent(roomState: RoomState): SetupStartedEvent {
  return {
    type: 'setup_started',
    roomCode: roomState.roomCode,
    roundNumber: roomState.roundNumber,
    startingCardCount: STARTING_CARD_COUNT,
  };
}

function setRoundPhase(roomState: RoomState, roundNumber: number): RoundStartedEvent {
  roomState.phase = 'round';
  roomState.roundNumber = roundNumber;
  roomState.attacker = getAttackerForRound(roundNumber);
  roomState.defender = getDefenderForRound(roundNumber);
  resetRoundLocks(roomState);
  clearPhaseReadyState(roomState);
  return createRoundStartedEvent(roomState);
}

function buildRoundRecord(roomState: RoomState, attackCardId: string, defenseCardId: string): RoundRecord {
  const attackerId = roomState.attacker;
  const defenderId = roomState.defender;
  const attacker = roomState.players[attackerId];

  if (!attacker) {
    throw new Error(`Missing attacker state for ${attackerId}.`);
  }

  const outcome = resolveRound(ROOM_CARDS_BY_ID[attackCardId], ROOM_CARDS_BY_ID[defenseCardId], attacker.wicketed);
  attacker.score += outcome.points;
  attacker.wicketed = attacker.wicketed || outcome.wicket;

  return {
    roundNumber: roomState.roundNumber,
    attacker: attackerId,
    defender: defenderId,
    attackCardId,
    defenseCardId,
    attackCardValue: ROOM_CARDS_BY_ID[attackCardId].value,
    defenseCardValue: ROOM_CARDS_BY_ID[defenseCardId].value,
    attackRank: ROOM_CARDS_BY_ID[attackCardId].rank,
    defenseRank: ROOM_CARDS_BY_ID[defenseCardId].rank,
    pointsScored: outcome.points,
    wicket: outcome.wicket,
    attackerWicketedAfterRound: attacker.wicketed,
    scoresAfterRound: getScoreRecord(roomState),
  };
}

export function applyPlayerReadyIntent(roomState: RoomState, playerId: PlayerId, ready: boolean): RoomTransitionResult {
  if (roomState.phase !== 'lobby') {
    return invalid('invalid_phase', 'player_ready is only valid while the room is in the lobby.');
  }

  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid('player_not_found', 'This player seat is not registered in the room.');
  }

  player.ready = ready;

  if (!areBothPlayersReady(roomState)) {
    return success();
  }

  roomState.phase = 'setup';
  clearPhaseReadyState(roomState);
  return success([createSetupStartedEvent(roomState)]);
}

export function applyStartingHandIntent(
  roomState: RoomState,
  playerId: PlayerId,
  cardIds: string[],
): RoomTransitionResult {
  if (roomState.phase !== 'setup') {
    return invalid('invalid_phase', 'submit_starting_hand is only valid during setup.');
  }

  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid('player_not_found', 'This player seat is not registered in the room.');
  }

  if (roomState.lockedChoices.startingHands[playerId]) {
    return invalid('starting_hand_already_submitted', 'Starting hand has already been submitted.');
  }

  const validation = validateStartingSelection(player, cardIds, ROOM_CARDS_BY_ID);
  if (!validation.valid) {
    return invalid('invalid_starting_hand', validation.reason ?? 'Starting hand validation failed.');
  }

  const spend = cardIds.reduce((total, cardId) => total + ROOM_CARDS_BY_ID[cardId].value, 0);
  player.selectedCardIds = [...cardIds];
  player.handCardIds = [...cardIds];
  player.startingHandCardIds = [...cardIds];
  player.spent = spend;
  player.startingSpend = spend;
  player.budgetRemaining = TOTAL_BUDGET - spend;
  player.remainingPoolCardIds = player.remainingPoolCardIds.filter((cardId) => !cardIds.includes(cardId));
  roomState.lockedChoices.startingHands[playerId] = [...cardIds];

  const bothSubmitted = PLAYER_IDS.every((id) => Array.isArray(roomState.lockedChoices.startingHands[id]));
  if (!bothSubmitted) {
    return success();
  }

  roomState.phase = 'opening-reveal';
  roomState.openingSpendRevealed = true;
  clearPhaseReadyState(roomState);

  const event: OpeningSpendRevealedEvent = {
    type: 'opening_spend_revealed',
    roomCode: roomState.roomCode,
    spends: getOpeningSpends(roomState),
  };

  return success([event]);
}

export function applyRoundCardIntent(
  roomState: RoomState,
  playerId: PlayerId,
  cardId: string,
): RoomTransitionResult {
  if (roomState.phase !== 'round') {
    return invalid('invalid_phase', 'lock_round_card is only valid during a live round.');
  }

  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid('player_not_found', 'This player seat is not registered in the room.');
  }

  if (roomState.lockedChoices.roundCards[playerId]) {
    return invalid('round_card_already_locked', 'This player has already locked a round card.');
  }

  const validation = validatePlayableCard(player, cardId);
  if (!validation.valid) {
    return invalid('invalid_round_card', validation.reason ?? 'Round card validation failed.');
  }

  roomState.lockedChoices.roundCards[playerId] = cardId;
  player.handCardIds = player.handCardIds.filter((currentCardId) => currentCardId !== cardId);

  const bothLocked = PLAYER_IDS.every((id) => typeof roomState.lockedChoices.roundCards[id] === 'string');
  if (!bothLocked) {
    return success();
  }

  const attackCardId = roomState.lockedChoices.roundCards[roomState.attacker];
  const defenseCardId = roomState.lockedChoices.roundCards[roomState.defender];

  if (!attackCardId || !defenseCardId) {
    return invalid('round_resolution_failed', 'Could not resolve the round because one lock is missing.');
  }

  const roundRecord = buildRoundRecord(roomState, attackCardId, defenseCardId);
  roomState.discardHistory.push(roundRecord);

  const resolvedEvent: RoundResolvedEvent = {
    type: 'round_resolved',
    roomCode: roomState.roomCode,
    round: roundRecord,
    discardCount: roomState.discardHistory.length,
  };

  if (roomState.roundNumber >= TOTAL_ROUNDS) {
    roomState.phase = 'finished';
    roomState.winner = getWinner(getScoreRecord(roomState));

    return success([
      resolvedEvent,
      {
        type: 'match_finished',
        roomCode: roomState.roomCode,
        winner: roomState.winner,
        scores: getScoreRecord(roomState),
      },
    ]);
  }

  roomState.phase = 'round-reveal';
  clearPhaseReadyState(roomState);
  return success([resolvedEvent]);
}

export function applyReplenishmentIntent(
  roomState: RoomState,
  playerId: PlayerId,
  cardId: string,
): RoomTransitionResult {
  if (roomState.phase !== 'replenishment') {
    return invalid('invalid_phase', 'buy_replenishment_card is only valid during replenishment.');
  }

  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid('player_not_found', 'This player seat is not registered in the room.');
  }

  if (roomState.lockedChoices.replenishments[playerId]) {
    return invalid('replenishment_already_locked', 'This player has already locked a replenishment card.');
  }

  const validation = validateReplenishmentPurchase(player, cardId, ROOM_CARDS_BY_ID, roomState.roundNumber);
  if (!validation.valid) {
    return invalid(
      'invalid_replenishment_card',
      validation.reason ?? 'Replenishment validation failed.',
    );
  }

  const cardValue = ROOM_CARDS_BY_ID[cardId].value;
  player.selectedCardIds = [...player.selectedCardIds, cardId];
  player.handCardIds = [...player.handCardIds, cardId];
  player.replenishmentCardIds = [...player.replenishmentCardIds, cardId];
  player.remainingPoolCardIds = player.remainingPoolCardIds.filter((currentCardId) => currentCardId !== cardId);
  player.spent += cardValue;
  player.budgetRemaining = TOTAL_BUDGET - player.spent;
  roomState.lockedChoices.replenishments[playerId] = cardId;

  const bothLocked = PLAYER_IDS.every((id) => typeof roomState.lockedChoices.replenishments[id] === 'string');
  if (!bothLocked) {
    return success();
  }

  roomState.phase = 'replenishment-reveal';
  clearPhaseReadyState(roomState);

  const event: ReplenishmentResolvedEvent = {
    type: 'replenishment_resolved',
    roomCode: roomState.roomCode,
    afterRound: roomState.roundNumber,
    nextRound: roomState.roundNumber + 1,
  };

  return success([event]);
}

export function applyNextPhaseReadyIntent(roomState: RoomState, playerId: PlayerId): RoomTransitionResult {
  if (!['opening-reveal', 'round-reveal', 'replenishment-reveal'].includes(roomState.phase)) {
    return invalid('invalid_phase', 'next_phase_ready is not valid in the current room phase.');
  }

  if (!requirePlayer(roomState, playerId)) {
    return invalid('player_not_found', 'This player seat is not registered in the room.');
  }

  roomState.lockedChoices.nextPhaseReady[playerId] = true;
  if (!areAllPhaseReady(roomState)) {
    return success();
  }

  clearPhaseReadyState(roomState);

  if (roomState.phase === 'opening-reveal') {
    return success([setRoundPhase(roomState, 1)]);
  }

  if (roomState.phase === 'round-reveal') {
    if (roomState.roundNumber <= REPLENISHMENT_ROUNDS) {
      roomState.phase = 'replenishment';
      resetReplenishmentLocks(roomState);
      clearPhaseReadyState(roomState);

      return success([
        {
          type: 'replenishment_started',
          roomCode: roomState.roomCode,
          afterRound: roomState.roundNumber,
        },
      ]);
    }

    return success([setRoundPhase(roomState, roomState.roundNumber + 1)]);
  }

  return success([setRoundPhase(roomState, roomState.roundNumber + 1)]);
}
