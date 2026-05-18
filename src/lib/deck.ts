import { RANKS, type Card, type CardColor, type PlayerId, type Rank, type Suit } from '../types/game';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diamonds: '♦',
};

const SUIT_SHORT_CODES: Record<Suit, string> = {
  spades: 'S',
  clubs: 'C',
  hearts: 'H',
  diamonds: 'D',
};

const PLAYER_SUITS: Record<PlayerId, Suit[]> = {
  player1: ['spades', 'clubs'],
  player2: ['hearts', 'diamonds'],
};

export function getCardValue(rank: Rank): number {
  if (rank === 'A') {
    return 1;
  }

  if (rank === 'J' || rank === 'Q' || rank === 'K') {
    return 10;
  }

  return Number(rank);
}

function getCardColor(suit: Suit): CardColor {
  return suit === 'spades' || suit === 'clubs' ? 'black' : 'red';
}

function formatSuitName(suit: Suit): string {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
}

export function buildDeck(): Card[] {
  const suits: Suit[] = ['spades', 'clubs', 'hearts', 'diamonds'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of RANKS) {
      const symbol = SUIT_SYMBOLS[suit];
      const shortCode = SUIT_SHORT_CODES[suit];

      deck.push({
        id: `${rank}${shortCode}`,
        rank,
        suit,
        color: getCardColor(suit),
        value: getCardValue(rank),
        shortLabel: `${rank}${symbol}`,
        displayLabel: `${rank} of ${formatSuitName(suit)}`,
        suitSymbol: symbol,
      });
    }
  }

  return deck;
}

export function buildCardLookup(deck: Card[]): Record<string, Card> {
  return deck.reduce<Record<string, Card>>((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});
}

export function getPlayerPool(deck: Card[], playerId: PlayerId): Card[] {
  const allowedSuits = new Set(PLAYER_SUITS[playerId]);
  return deck.filter((card) => allowedSuits.has(card.suit));
}
