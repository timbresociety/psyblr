import type { PlayerId, Role } from './types';

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
