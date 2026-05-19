import { buildCardLookup, buildDeck, getPlayerPool } from './deck';
import { REPLENISHMENT_ROUNDS, TOTAL_ROUNDS } from './constants';
import { resolveRound } from './rounds';
import { getAttackerForRound, getDefenderForRound, getRoleForPlayer } from './turns';
import type {
  Card,
  GameAction,
  GamePhase,
  GameState,
  PendingRoundResolution,
  PhaseTarget,
  PlayerId,
  PlayerState,
  RoundRecord,
} from './types';
import {
  getCardsByIds,
  sumCardValues,
  validatePlayableCard,
  validateReplenishmentPurchase,
  validateStartingSelection,
} from './validation';
import { getWinner } from './winner';

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
        message: 'Both hidden cards are locked in. Continue when both players are ready to reveal the result.',
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

function phaseFromTarget(
  target: PhaseTarget,
  roundNumber: number,
  pendingRoundResolution: PendingRoundResolution | null,
): GamePhase {
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
  const [attackCard, defenseCard] = getCardsByIds([attackCardId, defenseCardId], state.cardsById);

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
    case 'acknowledge-starting-totals': {
      if (state.phase.type !== 'starting-totals') {
        return state;
      }

      return {
        ...state,
        phase: createPassPhase({ type: 'play', player: getAttackerForRound(1) }, 1),
      };
    }
    case 'advance-after-round': {
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
    }
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
