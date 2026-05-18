import { buildDeck, buildCardLookup } from '../lib/deck';
import {
  REPLENISHMENT_ROUNDS,
  createInitialGameState,
  gameReducer,
  getAttackerForRound,
  getWinner,
  resolveRound,
  validateBudgetForAdditionalCards,
  validateReplenishmentPurchase,
} from '../lib/game';

describe('resolveRound', () => {
  const deck = buildDeck();
  const cardsById = buildCardLookup(deck);

  it('scores the difference when attack beats defense', () => {
    const result = resolveRound(cardsById['9S'], cardsById['5H'], false);
    expect(result).toEqual({ points: 4, wicket: false });
  });

  it('detects a wicket on exact rank match', () => {
    const result = resolveRound(cardsById['QS'], cardsById['QH'], false);
    expect(result).toEqual({ points: 0, wicket: true });
  });

  it('keeps the score at zero after an earlier wicket', () => {
    const result = resolveRound(cardsById['10S'], cardsById['2H'], true);
    expect(result).toEqual({ points: 0, wicket: false });
  });
});

describe('budget validation', () => {
  it('rejects duplicate cards in the same selection', () => {
    const state = createInitialGameState();
    const validation = validateBudgetForAdditionalCards(state.players.player1, ['AS', 'AS'], state.cardsById);

    expect(validation.valid).toBe(false);
  });

  it('rejects a later purchase that keeps spend under 69 but makes the 10-card plan impossible', () => {
    const state = createInitialGameState();
    const player = {
      ...state.players.player1,
      selectedCardIds: ['AS', 'AC', '10S', '10C', 'KS', 'KC', 'QS', 'QC'],
      handCardIds: ['AS', 'AC', '10S', '10C', 'KS', 'KC', 'QS', 'QC'],
      spent: 62,
      startingSpend: 20,
    };
    const validation = validateBudgetForAdditionalCards(player, ['6S'], state.cardsById);

    expect(validation.valid).toBe(false);
  });
});

describe('replenishment validation', () => {
  it('allows replenishment during rounds 1 to 5 when budget remains viable', () => {
    const state = createInitialGameState();
    const player = {
      ...state.players.player1,
      selectedCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      handCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      spent: 9,
      startingSpend: 9,
    };

    const validation = validateReplenishmentPurchase(player, '3C', state.cardsById, REPLENISHMENT_ROUNDS);
    expect(validation.valid).toBe(true);
  });

  it('rejects replenishment outside rounds 1 to 5', () => {
    const state = createInitialGameState();
    const player = {
      ...state.players.player1,
      selectedCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      handCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      spent: 9,
      startingSpend: 9,
    };

    const validation = validateReplenishmentPurchase(player, '3C', state.cardsById, 6);
    expect(validation.valid).toBe(false);
  });
});

describe('attack and defense alternation', () => {
  it('alternates attackers by round number', () => {
    expect(getAttackerForRound(1)).toBe('player1');
    expect(getAttackerForRound(2)).toBe('player2');
    expect(getAttackerForRound(3)).toBe('player1');
    expect(getAttackerForRound(10)).toBe('player2');
  });
});

describe('winner calculation', () => {
  it('returns the correct winner or draw', () => {
    expect(getWinner({ player1: 11, player2: 8 })).toBe('player1');
    expect(getWinner({ player1: 4, player2: 9 })).toBe('player2');
    expect(getWinner({ player1: 7, player2: 7 })).toBe('draw');
  });
});

describe('game reducer wicket flow', () => {
  it('starts behind a pass-device screen before the first secret setup', () => {
    const state = createInitialGameState();

    expect(state.phase.type).toBe('pass');
    if (state.phase.type === 'pass') {
      expect(state.phase.next).toEqual({ type: 'setup', player: 'player1' });
    }
  });

  it('keeps starting spend hidden until the public reveal screen is opened', () => {
    let state = createInitialGameState();

    state = gameReducer(state, { type: 'advance-pass' });
    state = gameReducer(state, { type: 'confirm-setup', player: 'player1', cardIds: ['AS', 'AC', '2S', '2C', '3S'] });
    state = gameReducer(state, { type: 'advance-pass' });
    state = gameReducer(state, { type: 'confirm-setup', player: 'player2', cardIds: ['AH', 'AD', '2H', '2D', '3H'] });

    expect(state.startingTotalsRevealed).toBe(false);
    expect(state.phase.type).toBe('pass');

    state = gameReducer(state, { type: 'advance-pass' });

    expect(state.startingTotalsRevealed).toBe(true);
    expect(state.phase.type).toBe('starting-totals');
  });

  it('marks the attacker as wicketed when equal ranks are revealed', () => {
    let state = createInitialGameState();

    state = {
      ...state,
      startingTotalsRevealed: true,
      players: {
        player1: {
          ...state.players.player1,
          selectedCardIds: ['QS'],
          handCardIds: ['QS'],
          spent: 10,
          startingSpend: 10,
        },
        player2: {
          ...state.players.player2,
          selectedCardIds: ['QH'],
          handCardIds: ['QH'],
          spent: 10,
          startingSpend: 10,
        },
      },
      phase: {
        type: 'play',
        player: 'player1',
        role: 'attack',
        roundNumber: 1,
      },
    };

    state = gameReducer(state, { type: 'confirm-play', player: 'player1', cardId: 'QS' });
    state = gameReducer(state, { type: 'advance-pass' });
    state = gameReducer(state, { type: 'confirm-play', player: 'player2', cardId: 'QH' });

    expect(state.phase.type).toBe('pass');
    expect(state.history).toHaveLength(0);

    state = gameReducer(state, { type: 'advance-pass' });

    expect(state.history[0].wicket).toBe(true);
    expect(state.players.player1.wicketed).toBe(true);
    expect(state.players.player1.score).toBe(0);
  });
});
