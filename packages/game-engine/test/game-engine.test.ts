import { describe, expect, it } from 'vitest';
import {
  buildCardLookup,
  buildDeck,
  createInitialGameState,
  getAttackerForRound,
  getCardValue,
  getRoleForPlayer,
  getWinner,
  isWicket,
  resolveRound,
  validateReplenishmentPurchase,
  validateStartingSelection,
} from '../src/index';

describe('card values', () => {
  it('maps ranks to Psyblr values', () => {
    expect(getCardValue('A')).toBe(1);
    expect(getCardValue('2')).toBe(2);
    expect(getCardValue('10')).toBe(10);
    expect(getCardValue('J')).toBe(10);
    expect(getCardValue('Q')).toBe(10);
    expect(getCardValue('K')).toBe(10);
  });
});

describe('wicket detection', () => {
  const cardsById = buildCardLookup(buildDeck());

  it('detects a wicket when the exact ranks match', () => {
    expect(isWicket(cardsById.QS, cardsById.QH)).toBe(true);
  });

  it('does not mark different ranks as a wicket', () => {
    expect(isWicket(cardsById.QS, cardsById.KH)).toBe(false);
  });
});

describe('starting hand validation', () => {
  it('allows a legal five-card opening hand from the right pool', () => {
    const state = createInitialGameState();

    const validation = validateStartingSelection(state.players.player1, ['AS', 'AC', '2S', '2C', '3S'], state.cardsById);

    expect(validation.valid).toBe(true);
  });

  it('rejects an illegal opening hand with duplicate cards', () => {
    const state = createInitialGameState();

    const validation = validateStartingSelection(state.players.player1, ['AS', 'AS', '2S', '2C', '3S'], state.cardsById);

    expect(validation.valid).toBe(false);
  });

  it('rejects an opening hand from the wrong color pool', () => {
    const state = createInitialGameState();

    const validation = validateStartingSelection(state.players.player1, ['AH', 'AC', '2S', '2C', '3S'], state.cardsById);

    expect(validation.valid).toBe(false);
  });
});

describe('replenishment legality', () => {
  it('allows a legal replenishment during rounds 1 to 5', () => {
    const state = createInitialGameState();
    const player = {
      ...state.players.player1,
      selectedCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      handCardIds: ['AS', 'AC', '2S', '2C', '3S'],
      spent: 9,
      startingSpend: 9,
    };

    const validation = validateReplenishmentPurchase(player, '3C', state.cardsById, 4);

    expect(validation.valid).toBe(true);
  });

  it('rejects replenishment after round 5', () => {
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

describe('round scoring', () => {
  const cardsById = buildCardLookup(buildDeck());

  it('scores the difference when attack beats defense', () => {
    expect(resolveRound(cardsById['9S'], cardsById['5H'], false)).toEqual({
      points: 4,
      wicket: false,
    });
  });

  it('scores zero when defense equals or beats attack', () => {
    expect(resolveRound(cardsById['5S'], cardsById['5H'], false)).toEqual({
      points: 0,
      wicket: true,
    });
    expect(resolveRound(cardsById['5S'], cardsById['8H'], false)).toEqual({
      points: 0,
      wicket: false,
    });
  });

  it('keeps future attacking rounds at zero after a wicket', () => {
    expect(resolveRound(cardsById['10S'], cardsById['2H'], true)).toEqual({
      points: 0,
      wicket: false,
    });
  });
});

describe('turn alternation', () => {
  it('alternates attacker and role by round number', () => {
    expect(getAttackerForRound(1)).toBe('player1');
    expect(getAttackerForRound(2)).toBe('player2');
    expect(getRoleForPlayer(3, 'player1')).toBe('attack');
    expect(getRoleForPlayer(3, 'player2')).toBe('defense');
  });
});

describe('winner logic', () => {
  it('returns the correct match winner or draw', () => {
    expect(getWinner({ player1: 12, player2: 9 })).toBe('player1');
    expect(getWinner({ player1: 7, player2: 11 })).toBe('player2');
    expect(getWinner({ player1: 8, player2: 8 })).toBe('draw');
  });
});
