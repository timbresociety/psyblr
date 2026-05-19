import { TOTAL_BUDGET, TOTAL_SELECTED_CARDS } from '@psyblr/game-engine';
import type { Card, PlayerState, Role } from '@psyblr/game-engine';
import { SecretCardPicker } from './SecretCardPicker';

interface RoundPlayScreenProps {
  player: PlayerState;
  roundNumber: number;
  role: Role;
  cards: Card[];
  onConfirm: (cardId: string) => string | null;
}

export function RoundPlayScreen({ player, roundNumber, role, cards, onConfirm }: RoundPlayScreenProps) {
  const roleLabel = role === 'attack' ? 'Attacker turn' : 'Defender turn';
  const roleDescription =
    role === 'attack'
      ? 'Pick the card that tries to beat the defense by value. Same rank as the defense is still a wicket.'
      : 'Pick the card that can hold the attack to 0, or match its rank to take a wicket.';

  const wicketWarning =
    role === 'attack' && player.wicketed
      ? 'This player is already wicketed. Future attack reveals still happen, but every remaining attack turn will score 0.'
      : undefined;

  return (
    <SecretCardPicker
      title={`${player.name}: Round ${roundNumber}`}
      subtitle={`${roleLabel}. ${roleDescription}`}
      cards={cards}
      requiredSelections={1}
      selectionMode="single"
      confirmLabel={role === 'attack' ? 'Lock attack card' : 'Lock defense card'}
      helperText={wicketWarning}
      infoRows={[
        { label: 'Role', value: role === 'attack' ? 'Attack' : 'Defense' },
        { label: 'Score', value: player.score.toString() },
        { label: 'Hand left', value: player.handCardIds.length.toString() },
        { label: 'Cards chosen', value: `${player.selectedCardIds.length}/${TOTAL_SELECTED_CARDS}` },
        { label: 'Budget left', value: (TOTAL_BUDGET - player.spent).toString() },
        { label: 'Pool left', value: (player.poolCardIds.length - player.selectedCardIds.length).toString() },
        { label: 'Wicketed', value: player.wicketed ? 'Yes' : 'No' },
      ]}
      onConfirm={(cardIds) => onConfirm(cardIds[0])}
    />
  );
}
