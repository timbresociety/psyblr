import {
  REPLENISHMENT_ROUNDS,
  STARTING_CARD_COUNT,
  TOTAL_BUDGET,
  TOTAL_SELECTED_CARDS,
} from './constants';
import type { Card, PlayerState, ValidationResult } from './types';

function makeInvalid(reason: string): ValidationResult {
  return {
    valid: false,
    reason,
  };
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
