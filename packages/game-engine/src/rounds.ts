import type { Card } from './types';

export function isWicket(attackCard: Card, defenseCard: Card): boolean {
  return attackCard.rank === defenseCard.rank;
}

export function resolveRound(
  attackCard: Card,
  defenseCard: Card,
  attackerAlreadyWicketed: boolean,
): { points: number; wicket: boolean } {
  const wicket = isWicket(attackCard, defenseCard);

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
