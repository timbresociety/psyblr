import type { Card, PlayerId } from '@psyblr/game-engine';
import type { PrivatePlayerStateView, PublicMatchStateView } from '../lib/roomProtocol';
import { SecretCardPicker } from './SecretCardPicker';

interface RoomActionScreenProps {
  mode: 'setup' | 'round' | 'replenishment';
  roomState: PublicMatchStateView;
  privateState: PrivatePlayerStateView;
  localPlayerId: PlayerId;
  cards: Card[];
  localDisplayName: string;
  onConfirm: (cardIds: string[]) => string | null;
  busy: boolean;
  actionsDisabled?: boolean;
}

function getRole(roomState: PublicMatchStateView, localPlayerId: PlayerId): 'attack' | 'defense' {
  return roomState.attacker === localPlayerId ? 'attack' : 'defense';
}

export function RoomActionScreen({
  mode,
  roomState,
  privateState,
  localPlayerId,
  cards,
  localDisplayName,
  onConfirm,
  busy,
  actionsDisabled = false,
}: RoomActionScreenProps) {
  const currentLockedChoice = privateState.currentLockedChoice;
  const alreadyLocked = Array.isArray(currentLockedChoice)
    ? currentLockedChoice.length > 0
    : typeof currentLockedChoice === 'string';

  if (alreadyLocked) {
    return (
      <section className="liquid-panel liquid-panel--hidden screen-entrance px-6 py-7 sm:px-8">
        <span className="glass-chip glass-chip--hidden">Private player surface</span>
        <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">
          {mode === 'setup' ? 'Opening hand locked' : mode === 'round' ? 'Round card locked' : 'Replenishment locked'}
        </h2>
        <p className="body-copy mt-3 max-w-2xl">
          Your intent is safely on the server. Keep this screen open and wait for the opponent to finish their action.
        </p>
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-500)]">
          {mode === 'setup'
            ? 'The next public beat is the opening spend reveal.'
            : mode === 'round'
              ? 'The next public beat is the live round reveal once both cards are locked.'
              : 'The next public beat is the replenishment confirmation before the room moves on.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="glass-chip">Round {roomState.roundNumber}</span>
          <span className="glass-chip">Budget left {privateState.budgetRemaining}</span>
          <span className="glass-chip">Hand size {privateState.handCardIds.length}</span>
        </div>
      </section>
    );
  }

  const role = getRole(roomState, localPlayerId);
  const title =
    mode === 'setup'
      ? `${localDisplayName}: build your starting five`
      : mode === 'round'
        ? `${localDisplayName}: ${role === 'attack' ? 'attack' : 'defend'} round ${roomState.roundNumber}`
        : `${localDisplayName}: buy 1 replenishment card`;

  const subtitle =
    mode === 'setup'
      ? 'Choose exactly five cards from your private color pool. Only your opening spend total is later revealed.'
      : mode === 'round'
        ? role === 'attack'
          ? 'Choose the hidden attack card. The server resolves the result after both players lock.'
          : 'Choose the hidden defense card. The server resolves the result after both players lock.'
        : `After round ${roomState.roundNumber}, choose one extra hidden card from your remaining pool.`;

  const confirmLabel =
    mode === 'setup' ? 'Lock starting hand' : mode === 'round' ? `Lock ${role} card` : 'Lock replenishment';

  return (
    <SecretCardPicker
      key={`${mode}-${roomState.roundNumber}-${localPlayerId}`}
      title={title}
      subtitle={subtitle}
      cards={cards}
      requiredSelections={mode === 'setup' ? 5 : 1}
      selectionMode={mode === 'setup' ? 'multiple' : 'single'}
      confirmLabel={busy ? 'Sending...' : confirmLabel}
      helperText={
        actionsDisabled
          ? 'The client is reconnecting to the room. Your private hand stays local, and actions will reopen as soon as the socket is live again.'
          : mode === 'round' && role === 'attack' && privateState.wicketed
            ? 'You are already wicketed, so future attack turns still reveal a card but always score 0.'
            : undefined
      }
      infoRows={[
        { label: 'Room', value: roomState.roomCode },
        { label: 'Round', value: roomState.roundNumber.toString() },
        { label: 'Budget left', value: privateState.budgetRemaining.toString() },
        { label: 'Hand', value: privateState.handCardIds.length.toString() },
        { label: 'Chosen', value: privateState.selectedCardIds.length.toString() },
      ]}
      confirmDisabled={actionsDisabled}
      onConfirm={onConfirm}
    />
  );
}
