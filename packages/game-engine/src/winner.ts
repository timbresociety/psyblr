import type { PlayerId, Winner } from './types';

export function getWinner(scores: Record<PlayerId, number>): Winner {
  if (scores.player1 > scores.player2) {
    return 'player1';
  }

  if (scores.player2 > scores.player1) {
    return 'player2';
  }

  return 'draw';
}
