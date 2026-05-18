import { buildCardLookup, buildDeck, getPlayerPool } from './deck';
import type {
  Card,
  GameAction,
  GamePhase,
  GameState,
  PendingRoundResolution,
  PhaseTarget,
  PlayerId,
  PlayerState,
  Role,
  RoundRecord,
  ValidationResult,
  Winner,
} from '../types/game';

export const TOTAL_BUDGET = 69;
export const STARTING_CARD_COUNT = 5;
export const TOTAL_SELECTED_CARDS = 10;
export const TOTAL_ROUNDS = 10;
export const REPLENISHMENT_ROUNDS = 5;

const PLAYER_NAMES: Record<PlayerId, string> = {
  player1: 'Player 1',
  player2: 'Player 2',
};

const PLAYER_COLORS: Record<PlayerId, 'black' | 'red'> = {
  player1: 'black',
  player2: 'red',
};

function createPlayerState(playerId: PlayerId, deck: Card[]): PlayerState {
  return {
    id: playerId,
    name: PLAYER_NAMES[playerId],
    color: PLAYER_COLORS[playerId],
    poolCardIds: getPlayerPool(deck, playerId).map((card) => card.id),
    selectedCardIds: [],
    handCardIds: [],
    spent: 0,
    startingSpend: 0,
    score: 0,
    wicketed: false,
  };
}

export function createInitialGameState(): GameState {
  const deck = buildDeck();

  return {
    deck,
    cardsById: buildCardLookup(deck),
    players: {
      player1: createPlayerState('player1', deck),
      player2: createPlayerState('player2', deck),
    },
    currentRound: 1,
    startingTotalsRevealed: false,
    pendingRoundCardIds: {},
    pendingRoundResolution: null,
    history: [],
    phase: {
      type: 'pass',
      title: `Pass to ${PLAYER_NAMES.player1}`,
      message: `${PLAYER_NAMES.player1} will secretly choose a starting five.`,
      next: { type: 'setup', player: 'player1' },
    },
    winner: null,
  };
}

export function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1';
}

export function getAttackerForRound(roundNumber: number): PlayerId {
  return roundNumber % 2 === 1 ? 'player1' : 'player2';
}

export function getDefenderForRound(roundNumber: number): PlayerId {
  return getOpponent(getAttackerForRound(roundNumber));
}

export function getRoleForPlayer(roundNumber: number, playerId: PlayerId): Role {
  return getAttackerForRound(roundNumber) === playerId ? 'attack' : 'defense';
}

export function getCardsByIds(cardIds: string[], cardsById: Record<string, Card>): Card[] {
  return cardIds.map((cardId) => cardsById[cardId]).filter(Boolean);
}

export function sumCardValues(cardIds: string[], cardsById: Record<string, Card>): number {
  return getCardsByIds(cardIds, cardsById).reduce((total, card) => total + card.value, 0);
}

export function getRemainingPoolCards(
  player: PlayerState,
  cardsById: Record<string, Card>,
  additionalSelectedIds: string[] = [],
): Card[] {
  const takenCardIds = new Set([...player.selectedCardIds, ...additionalSelectedIds]);
  return player.poolCardIds
    .filter((cardId) => !takenCardIds.has(cardId))
    .map((cardId) => cardsById[cardId]);
}

export function getMinimumFutureSpend(
  player: PlayerState,
  cardsById: Record<string, Card>,
  additionalSelectedIds: string[],
): number {
  const cardsNeeded = TOTAL_SELECTED_CARDS - (player.selectedCardIds.length + additionalSelectedIds.length);

  if (cardsNeeded <= 0) {
    return 0;
  }

  const remaining = getRemainingPoolCards(player, cardsById, additionalSelectedIds)
    .map((card) => card.value)
    .sort((left, right) => left - right);

  if (remaining.length < cardsNeeded) {
    return Number.POSITIVE_INFINITY;
  }

  return remaining.slice(0, cardsNeeded).reduce((total, value) => total + value, 0);
}

function makeInvalid(reason: string): ValidationResult {
  return {
    valid: false,
    reason,
  };
}

function ensureCardIdsAreUnique(cardIds: string[]): ValidationResult {
  if (new Set(cardIds).size !== cardIds.length) {
    return makeInvalid('Each card can only be selected once.');
  }

  return { valid: true };
}

export function validateBudgetForAdditionalCards(
  player: PlayerState,
  additionalCardIds: string[],
  cardsById: Record<string, Card>,
): ValidationResult {
  const uniqueValidation = ensureCardIdsAreUnique(additionalCardIds);
  if (!uniqueValidation.valid) {
    return uniqueValidation;
  }

  const invalidPoolCard = additionalCardIds.find((cardId) => !player.poolCardIds.includes(cardId));
  if (invalidPoolCard) {
    return makeInvalid('Selected cards must come from the active player pool.');
  }

  const alreadyOwnedCard = additionalCardIds.find((cardId) => player.selectedCardIds.includes(cardId));
  if (alreadyOwnedCard) {
    return makeInvalid('A selected card cannot be bought twice.');
  }

  if (player.selectedCardIds.length + additionalCardIds.length > TOTAL_SELECTED_CARDS) {
    return makeInvalid(`Each player must select exactly ${TOTAL_SELECTED_CARDS} cards over the full game.`);
  }

  const proposedSpend = player.spent + sumCardValues(additionalCardIds, cardsById);
  if (proposedSpend > TOTAL_BUDGET) {
    return makeInvalid(`Selections cannot exceed the total budget of ${TOTAL_BUDGET}.`);
  }

  const minimumFutureSpend = getMinimumFutureSpend(player, cardsById, additionalCardIds);
  if (proposedSpend + minimumFutureSpend > TOTAL_BUDGET) {
    return makeInvalid('This choice leaves too little budget to complete all 10 card selections.');
  }

  return { valid: true };
}

export function validateStartingSelection(
  player: PlayerState,
  cardIds: string[],
  cardsById: Record<string, Card>,
): ValidationResult {
  if (cardIds.length !== STARTING_CARD_COUNT) {
    return makeInvalid(`Choose exactly ${STARTING_CARD_COUNT} starting cards.`);
  }

  return validateBudgetForAdditionalCards(player, cardIds, cardsById);
}

export function validateReplenishmentPurchase(
  player: PlayerState,
  cardId: string,
  cardsById: Record<string, Card>,
  roundNumber: number,
): ValidationResult {
  if (roundNumber < 1 || roundNumber > REPLENISHMENT_ROUNDS) {
    return makeInvalid(`Replenishment only happens after rounds 1 to ${REPLENISHMENT_ROUNDS}.`);
  }

  if (player.selectedCardIds.length < STARTING_CARD_COUNT) {
    return makeInvalid('Starting hands must be completed before replenishment.');
  }

  if (player.selectedCardIds.length >= TOTAL_SELECTED_CARDS) {
    return makeInvalid(`Each player can only select ${TOTAL_SELECTED_CARDS} cards total.`);
  }

  return validateBudgetForAdditionalCards(player, [cardId], cardsById);
}

export function validatePlayableCard(player: PlayerState, cardId: string): ValidationResult {
  if (!player.handCardIds.includes(cardId)) {
    return makeInvalid('Choose one card from the current hand.');
  }

  return { valid: true };
}

export function addCardsToPlayer(
  player: PlayerState,
  cardIds: string[],
  cardsById: Record<string, Card>,
  isStartingSelection: boolean,
): PlayerState {
  const addedSpend = sumCardValues(cardIds, cardsById);

  return {
    ...player,
    selectedCardIds: [...player.selectedCardIds, ...cardIds],
    handCardIds: [...player.handCardIds, ...cardIds],
    spent: player.spent + addedSpend,
    startingSpend: isStartingSelection ? player.startingSpend + addedSpend : player.startingSpend,
  };
}

export function removeCardFromHand(player: PlayerState, cardId: string): PlayerState {
  return {
    ...player,
    handCardIds: player.handCardIds.filter((currentCardId) => currentCardId !== cardId),
  };
}

export function resolveRound(
  attackCard: Card,
  defenseCard: Card,
  attackerAlreadyWicketed: boolean,
): { points: number; wicket: boolean } {
  const wicket = attackCard.rank === defenseCard.rank;

  if (attackerAlreadyWicketed || wicket) {
    return {
      points: 0,
      wicket,
    };
  }

  if (attackCard.value > defenseCard.value) {
    return {
      points: attackCard.value - defenseCard.value,
      wicket: false,
    };
  }

  return {
    points: 0,
    wicket: false,
  };
}

export function getWinner(scores: Record<PlayerId, number>): Winner {
  if (scores.player1 > scores.player2) {
    return 'player1';
  }

  if (scores.player2 > scores.player1) {
    return 'player2';
  }

  return 'draw';
}

function createPassPhase(next: PhaseTarget, roundNumber: number): GamePhase {
  switch (next.type) {
    case 'setup':
      return {
        type: 'pass',
        title: `Pass to ${PLAYER_NAMES[next.player]}`,
        message: `${PLAYER_NAMES[next.player]} will secretly choose a starting five.`,
        next,
      };
    case 'play': {
      const role = getRoleForPlayer(roundNumber, next.player);

      return {
        type: 'pass',
        title: `Pass to ${PLAYER_NAMES[next.player]}`,
        message: `Round ${roundNumber}: ${PLAYER_NAMES[next.player]} will secretly choose a ${role} card.`,
        next,
      };
    }
    case 'buy':
      return {
        type: 'pass',
        title: `Pass to ${PLAYER_NAMES[next.player]}`,
        message: `Round ${roundNumber} replenishment: ${PLAYER_NAMES[next.player]} will secretly buy one card.`,
        next,
      };
    case 'round-result':
      return {
        type: 'pass',
        title: `Reveal Round ${roundNumber}`,
        message: `Both hidden cards are locked in. Continue when both players are ready to reveal the result.`,
        next,
      };
    case 'starting-totals':
      return {
        type: 'pass',
        title: 'Reveal Starting Totals',
        message: 'Both starting hands are locked in. Continue to reveal only the starting spend totals.',
        next,
      };
    case 'game-over':
      return {
        type: 'pass',
        title: 'Game Over',
        message: 'All rounds are complete. Continue to the final summary.',
        next,
      };
  }
}

function phaseFromTarget(target: PhaseTarget, roundNumber: number, pendingRoundResolution: PendingRoundResolution | null): GamePhase {
  switch (target.type) {
    case 'setup':
      return { type: 'setup', player: target.player };
    case 'play':
      return {
        type: 'play',
        player: target.player,
        role: getRoleForPlayer(roundNumber, target.player),
        roundNumber,
      };
    case 'buy':
      return {
        type: 'buy',
        player: target.player,
        roundNumber,
      };
    case 'round-result':
      if (!pendingRoundResolution) {
        throw new Error('Cannot reveal a round result without a pending resolution.');
      }

      return {
        type: 'round-result',
        roundNumber: pendingRoundResolution.record.roundNumber,
        result: pendingRoundResolution.record,
      };
    case 'starting-totals':
      return { type: 'starting-totals' };
    case 'game-over':
      return { type: 'game-over' };
  }
}

function buildRoundRecord(
  state: GameState,
  attackCardId: string,
  defenseCardId: string,
  playersAfterPlays: Record<PlayerId, PlayerState>,
): PendingRoundResolution {
  const attacker = getAttackerForRound(state.currentRound);
  const defender = getDefenderForRound(state.currentRound);
  const attackCard = state.cardsById[attackCardId];
  const defenseCard = state.cardsById[defenseCardId];

  const outcome = resolveRound(attackCard, defenseCard, state.players[attacker].wicketed);
  const updatedAttacker = {
    ...playersAfterPlays[attacker],
    score: playersAfterPlays[attacker].score + outcome.points,
    wicketed: playersAfterPlays[attacker].wicketed || outcome.wicket,
  };

  const players = {
    ...playersAfterPlays,
    [attacker]: updatedAttacker,
  };

  const scoresAfterRound = {
    player1: players.player1.score,
    player2: players.player2.score,
  };

  const record: RoundRecord = {
    roundNumber: state.currentRound,
    attacker,
    defender,
    attackCardId,
    defenseCardId,
    attackCardValue: attackCard.value,
    defenseCardValue: defenseCard.value,
    attackRank: attackCard.rank,
    defenseRank: defenseCard.rank,
    pointsScored: outcome.points,
    wicket: outcome.wicket,
    attackerWicketedAfterRound: updatedAttacker.wicketed,
    scoresAfterRound,
  };

  return {
    players,
    record,
    winner: state.currentRound === TOTAL_ROUNDS ? getWinner(scoresAfterRound) : null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'restart':
      return createInitialGameState();
    case 'advance-pass': {
      if (state.phase.type !== 'pass') {
        return state;
      }

      const nextPhase = phaseFromTarget(state.phase.next, state.currentRound, state.pendingRoundResolution);

      return {
        ...state,
        players: state.phase.next.type === 'round-result' ? state.pendingRoundResolution?.players ?? state.players : state.players,
        history:
          state.phase.next.type === 'round-result' && state.pendingRoundResolution
            ? [...state.history, state.pendingRoundResolution.record]
            : state.history,
        winner:
          state.phase.next.type === 'round-result' && state.pendingRoundResolution
            ? state.pendingRoundResolution.winner
            : state.winner,
        startingTotalsRevealed: state.startingTotalsRevealed || state.phase.next.type === 'starting-totals',
        pendingRoundResolution: state.phase.next.type === 'round-result' ? null : state.pendingRoundResolution,
        phase: nextPhase,
      };
    }
    case 'acknowledge-starting-totals':
      if (state.phase.type !== 'starting-totals') {
        return state;
      }

      return {
        ...state,
        phase: createPassPhase({ type: 'play', player: getAttackerForRound(1) }, 1),
      };
    case 'advance-after-round':
      if (state.phase.type !== 'round-result') {
        return state;
      }

      if (state.currentRound === TOTAL_ROUNDS) {
        return {
          ...state,
          phase: { type: 'game-over' },
        };
      }

      if (state.currentRound <= REPLENISHMENT_ROUNDS) {
        return {
          ...state,
          phase: createPassPhase({ type: 'buy', player: 'player1' }, state.currentRound),
        };
      }

      return {
        ...state,
        currentRound: state.currentRound + 1,
        phase: createPassPhase(
          { type: 'play', player: getAttackerForRound(state.currentRound + 1) },
          state.currentRound + 1,
        ),
      };
    case 'confirm-setup': {
      if (state.phase.type !== 'setup' || state.phase.player !== action.player) {
        return state;
      }

      const player = state.players[action.player];
      const validation = validateStartingSelection(player, action.cardIds, state.cardsById);
      if (!validation.valid) {
        return state;
      }

      const updatedPlayer = addCardsToPlayer(player, action.cardIds, state.cardsById, true);
      const players = {
        ...state.players,
        [action.player]: updatedPlayer,
      };

      if (action.player === 'player1') {
        return {
          ...state,
          players,
          phase: createPassPhase({ type: 'setup', player: 'player2' }, state.currentRound),
        };
      }

      return {
        ...state,
        players,
        phase: createPassPhase({ type: 'starting-totals' }, state.currentRound),
      };
    }
    case 'confirm-play': {
      if (state.phase.type !== 'play' || state.phase.player !== action.player) {
        return state;
      }

      const player = state.players[action.player];
      const validation = validatePlayableCard(player, action.cardId);
      if (!validation.valid) {
        return state;
      }

      const playersAfterPlay = {
        ...state.players,
        [action.player]: removeCardFromHand(player, action.cardId),
      };

      const pendingRoundCardIds = {
        ...state.pendingRoundCardIds,
        [action.player]: action.cardId,
      };

      const attacker = getAttackerForRound(state.currentRound);
      const defender = getDefenderForRound(state.currentRound);

      if (action.player === attacker) {
        return {
          ...state,
          players: playersAfterPlay,
          pendingRoundCardIds,
          phase: createPassPhase({ type: 'play', player: defender }, state.currentRound),
        };
      }

      const attackCardId = pendingRoundCardIds[attacker];
      const defenseCardId = pendingRoundCardIds[defender];

      if (!attackCardId || !defenseCardId) {
        return state;
      }

      const resolvedRound = buildRoundRecord(state, attackCardId, defenseCardId, playersAfterPlay);

      return {
        ...state,
        pendingRoundCardIds: {},
        players: playersAfterPlay,
        pendingRoundResolution: resolvedRound,
        phase: createPassPhase({ type: 'round-result' }, state.currentRound),
      };
    }
    case 'confirm-buy': {
      if (state.phase.type !== 'buy' || state.phase.player !== action.player) {
        return state;
      }

      const player = state.players[action.player];
      const validation = validateReplenishmentPurchase(player, action.cardId, state.cardsById, state.currentRound);
      if (!validation.valid) {
        return state;
      }

      const updatedPlayer = addCardsToPlayer(player, [action.cardId], state.cardsById, false);
      const players = {
        ...state.players,
        [action.player]: updatedPlayer,
      };

      if (action.player === 'player1') {
        return {
          ...state,
          players,
          phase: createPassPhase({ type: 'buy', player: 'player2' }, state.currentRound),
        };
      }

      return {
        ...state,
        players,
        currentRound: state.currentRound + 1,
        phase: createPassPhase(
          { type: 'play', player: getAttackerForRound(state.currentRound + 1) },
          state.currentRound + 1,
        ),
      };
    }
  }
}
