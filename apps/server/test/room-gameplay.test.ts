import { describe, expect, it } from 'vitest';
import { getAttackerForRound, getDefenderForRound } from '@psyblr/game-engine';
import {
  applyNextPhaseReadyIntent,
  applyPlayerReadyIntent,
  applyReplenishmentIntent,
  applyRoundCardIntent,
  applyStartingHandIntent,
} from '../src/lib/room-gameplay';
import {
  createLobbyStateEvent,
  createPrivateStateEvent,
  createRoomPlayerState,
  createRoomState,
  isRoomExpired,
  updatePlayerConnectionState,
} from '../src/lib/room-state';
import type { RoomState } from '../src/types';

function createFullRoomState(): RoomState {
  const roomState = createRoomState('ROOM42', 'Host', 'host-token');
  roomState.players.player2 = createRoomPlayerState('player2', 'Guest', 'guest-token');
  return roomState;
}

describe('public and private room state separation', () => {
  it('keeps hidden hand and pool data out of public state snapshots', () => {
    const roomState = createFullRoomState();
    const publicEvent = createLobbyStateEvent(roomState);
    const privateEvent = createPrivateStateEvent(roomState, 'player1');

    expect(publicEvent.state.players[0]).not.toHaveProperty('handCardIds');
    expect(publicEvent.state.players[0]).not.toHaveProperty('remainingPoolCardIds');
    expect(publicEvent.state.players[0]).not.toHaveProperty('remainingPoolCount');
    expect(privateEvent.state).toHaveProperty('handCardIds');
    expect(privateEvent.state).toHaveProperty('remainingPoolCardIds');
  });
});

describe('room reconnect and expiry lifecycle', () => {
  it('starts with an abandonment deadline until a player connects', () => {
    const roomState = createFullRoomState();

    expect(roomState.abandonmentExpiresAt).not.toBeNull();

    updatePlayerConnectionState(roomState, 'player1', true, new Date('2026-05-19T00:00:00.000Z'));
    expect(roomState.players.player1?.connected).toBe(true);
    expect(roomState.players.player1?.disconnectedAt).toBeNull();
    expect(roomState.abandonmentExpiresAt).toBeNull();
  });

  it('restores an abandonment deadline when all players disconnect and eventually expires', () => {
    const roomState = createFullRoomState();
    const connectedAt = new Date('2026-05-19T00:00:00.000Z');

    updatePlayerConnectionState(roomState, 'player1', true, connectedAt);
    updatePlayerConnectionState(roomState, 'player2', true, connectedAt);
    updatePlayerConnectionState(roomState, 'player1', false, new Date('2026-05-19T00:10:00.000Z'));
    updatePlayerConnectionState(roomState, 'player2', false, new Date('2026-05-19T00:10:00.000Z'));

    expect(roomState.abandonmentExpiresAt).toBe('2026-05-19T00:40:00.000Z');
    expect(isRoomExpired(roomState, new Date('2026-05-19T00:39:59.000Z'))).toBe(false);
    expect(isRoomExpired(roomState, new Date('2026-05-19T00:40:01.000Z'))).toBe(true);
  });
});

describe('room readiness and setup flow', () => {
  it('moves from lobby to setup only after both players are ready', () => {
    const roomState = createFullRoomState();

    const firstReady = applyPlayerReadyIntent(roomState, 'player1', true);
    expect(firstReady.ok).toBe(true);
    expect(roomState.phase).toBe('lobby');

    const secondReady = applyPlayerReadyIntent(roomState, 'player2', true);
    expect(secondReady.ok).toBe(true);
    expect(roomState.phase).toBe('setup');
    if (secondReady.ok) {
      expect(secondReady.events[0]?.type).toBe('setup_started');
    }
  });

  it('reveals only opening spend totals after both legal starting hands are submitted', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'setup';

    const player1Start = applyStartingHandIntent(roomState, 'player1', ['AS', 'AC', '2S', '2C', '3S']);
    expect(player1Start.ok).toBe(true);
    expect(roomState.phase).toBe('setup');

    const player2Start = applyStartingHandIntent(roomState, 'player2', ['AH', 'AD', '2H', '2D', '3H']);
    expect(player2Start.ok).toBe(true);
    expect(roomState.phase).toBe('opening-reveal');
    expect(roomState.openingSpendRevealed).toBe(true);

    if (player2Start.ok) {
      expect(player2Start.events[0]).toEqual({
        type: 'opening_spend_revealed',
        roomCode: 'ROOM42',
        spends: {
          player1: 9,
          player2: 9,
        },
      });
    }
  });
});

describe('round flow and scoring', () => {
  it('starts round 1 after both players acknowledge the opening reveal', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'opening-reveal';

    const firstReady = applyNextPhaseReadyIntent(roomState, 'player1');
    expect(firstReady.ok).toBe(true);
    expect(roomState.phase).toBe('opening-reveal');

    const secondReady = applyNextPhaseReadyIntent(roomState, 'player2');
    expect(secondReady.ok).toBe(true);
    expect(roomState.phase).toBe('round');
    expect(roomState.roundNumber).toBe(1);
    expect(roomState.attacker).toBe(getAttackerForRound(1));
    expect(roomState.defender).toBe(getDefenderForRound(1));
  });

  it('resolves a wicket and marks the attacker out for future scoring turns', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'round';
    roomState.roundNumber = 1;
    roomState.attacker = 'player1';
    roomState.defender = 'player2';
    roomState.players.player1!.handCardIds = ['QS'];
    roomState.players.player1!.selectedCardIds = ['QS'];
    roomState.players.player2!.handCardIds = ['QH'];
    roomState.players.player2!.selectedCardIds = ['QH'];

    const firstLock = applyRoundCardIntent(roomState, 'player1', 'QS');
    expect(firstLock.ok).toBe(true);

    const secondLock = applyRoundCardIntent(roomState, 'player2', 'QH');
    expect(secondLock.ok).toBe(true);
    expect(roomState.phase).toBe('round-reveal');
    expect(roomState.players.player1!.wicketed).toBe(true);
    expect(roomState.players.player1!.score).toBe(0);

    if (secondLock.ok) {
      expect(secondLock.events[0]?.type).toBe('round_resolved');
      if (secondLock.events[0]?.type === 'round_resolved') {
        expect(secondLock.events[0].round.wicket).toBe(true);
      }
    }
  });

  it('forces future attack rounds to score zero after a wicket while still resolving the round', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'round';
    roomState.roundNumber = 3;
    roomState.attacker = 'player1';
    roomState.defender = 'player2';
    roomState.players.player1!.wicketed = true;
    roomState.players.player1!.handCardIds = ['10S'];
    roomState.players.player1!.selectedCardIds = ['10S'];
    roomState.players.player2!.handCardIds = ['2H'];
    roomState.players.player2!.selectedCardIds = ['2H'];

    expect(applyRoundCardIntent(roomState, 'player1', '10S').ok).toBe(true);
    const result = applyRoundCardIntent(roomState, 'player2', '2H');

    expect(result.ok).toBe(true);
    expect(roomState.players.player1!.score).toBe(0);

    if (result.ok && result.events[0]?.type === 'round_resolved') {
      expect(result.events[0].round.pointsScored).toBe(0);
      expect(result.events[0].round.wicket).toBe(false);
    }
  });
});

describe('replenishment flow', () => {
  it('only resolves replenishment after both players lock a legal buy', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'replenishment';
    roomState.roundNumber = 1;
    roomState.players.player1!.selectedCardIds = ['AS', 'AC', '2S', '2C', '3S'];
    roomState.players.player1!.handCardIds = ['AS', 'AC', '2S', '2C', '3S'];
    roomState.players.player1!.spent = 9;
    roomState.players.player1!.startingSpend = 9;
    roomState.players.player1!.budgetRemaining = 60;
    roomState.players.player1!.remainingPoolCardIds = roomState.players.player1!.remainingPoolCardIds.filter((id) => !roomState.players.player1!.selectedCardIds.includes(id));
    roomState.players.player2!.selectedCardIds = ['AH', 'AD', '2H', '2D', '3H'];
    roomState.players.player2!.handCardIds = ['AH', 'AD', '2H', '2D', '3H'];
    roomState.players.player2!.spent = 9;
    roomState.players.player2!.startingSpend = 9;
    roomState.players.player2!.budgetRemaining = 60;
    roomState.players.player2!.remainingPoolCardIds = roomState.players.player2!.remainingPoolCardIds.filter((id) => !roomState.players.player2!.selectedCardIds.includes(id));

    expect(applyReplenishmentIntent(roomState, 'player1', '3C').ok).toBe(true);
    const result = applyReplenishmentIntent(roomState, 'player2', '3D');

    expect(result.ok).toBe(true);
    expect(roomState.phase).toBe('replenishment-reveal');

    if (result.ok) {
      expect(result.events[0]).toEqual({
        type: 'replenishment_resolved',
        roomCode: 'ROOM42',
        afterRound: 1,
        nextRound: 2,
      });
    }
  });

  it('rejects replenishment after round 5', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'replenishment';
    roomState.roundNumber = 6;
    roomState.players.player1!.selectedCardIds = ['AS', 'AC', '2S', '2C', '3S'];
    roomState.players.player1!.handCardIds = ['AS', 'AC', '2S', '2C', '3S'];

    const result = applyReplenishmentIntent(roomState, 'player1', '3C');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_replenishment_card');
    }
  });
});

describe('match end logic', () => {
  it('ends after round 10 and returns draw when scores are equal', () => {
    const roomState = createFullRoomState();
    roomState.phase = 'round';
    roomState.roundNumber = 10;
    roomState.attacker = 'player2';
    roomState.defender = 'player1';
    roomState.players.player1!.score = 5;
    roomState.players.player2!.score = 5;
    roomState.players.player1!.handCardIds = ['5S'];
    roomState.players.player1!.selectedCardIds = ['5S'];
    roomState.players.player2!.handCardIds = ['2H'];
    roomState.players.player2!.selectedCardIds = ['2H'];

    expect(applyRoundCardIntent(roomState, 'player2', '2H').ok).toBe(true);
    const result = applyRoundCardIntent(roomState, 'player1', '5S');

    expect(result.ok).toBe(true);
    expect(roomState.phase).toBe('finished');
    expect(roomState.winner).toBe('draw');

    if (result.ok) {
      expect(result.events.map((event) => event.type)).toEqual(['round_resolved', 'match_finished']);
    }
  });
});
