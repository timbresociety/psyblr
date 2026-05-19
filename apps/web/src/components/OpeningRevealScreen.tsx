import type { PlayerId } from '@psyblr/game-engine';
import type { PublicMatchStateView } from '../lib/roomProtocol';

interface OpeningRevealScreenProps {
  roomState: PublicMatchStateView;
  localPlayerId: PlayerId;
  onContinue: () => void;
  busy: boolean;
  actionsDisabled?: boolean;
}

export function OpeningRevealScreen({
  roomState,
  localPlayerId,
  onContinue,
  busy,
  actionsDisabled = false,
}: OpeningRevealScreenProps) {
  const localPlayer = roomState.players.find((player) => player.id === localPlayerId);
  const opponentPlayer = roomState.players.find((player) => player.id !== localPlayerId);
  const localSpend = localPlayer?.startingSpend ?? 0;
  const opponentSpend = opponentPlayer?.startingSpend ?? 0;
  const spendDelta = Math.abs(localSpend - opponentSpend);
  const higherSpendCopy =
    spendDelta === 0
      ? 'Both players opened on the same total.'
      : localSpend > opponentSpend
        ? `You opened ${spendDelta} point${spendDelta === 1 ? '' : 's'} heavier.`
        : `${opponentPlayer?.displayName ?? 'Opponent'} opened ${spendDelta} point${spendDelta === 1 ? '' : 's'} heavier.`;
  const firstAttacker = roomState.players.find((player) => player.id === roomState.attacker);

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="glass-chip glass-chip--public">Opening reveal</span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">Only the spend totals go public</h2>
          <p className="body-copy mt-3 max-w-3xl">
            The server has accepted both hidden opening hands. This screen shows only the amount each player spent on
            their starting five before round 1 begins.
          </p>
        </div>
        <button type="button" onClick={onContinue} disabled={busy || actionsDisabled} className="chrome-button min-w-[200px]">
          {actionsDisabled ? 'Reconnecting...' : busy ? 'Waiting...' : 'Ready for round 1'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[localPlayer, opponentPlayer].filter(Boolean).map((player) => (
          <article key={player?.id} className="liquid-panel liquid-panel--neutral px-5 py-5">
            <span className="glass-chip">{player?.displayName}</span>
            <p className="liquid-title mt-4 text-5xl">{player?.startingSpend ?? '••'}</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
              {player?.id === localPlayerId ? 'Your exact cards stay private on this client.' : 'Opponent card details stay hidden.'}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <p className="micro-copy">Opening read</p>
          <h3 className="liquid-title mt-3 text-2xl">{higherSpendCopy}</h3>
          <p className="body-copy mt-3">
            Spend totals are the only public clue before live cards begin to flip. Everything else about both starting hands stays hidden.
          </p>
        </article>
        <article className="liquid-panel liquid-panel--success px-5 py-5">
          <p className="micro-copy">Next transition</p>
          <h3 className="liquid-title mt-3 text-2xl">{firstAttacker?.displayName ?? 'Player 1'} attacks round 1</h3>
          <p className="body-copy mt-3">
            Once both players confirm this reveal, the room moves into the first secret attack and defense lock.
          </p>
        </article>
      </div>
    </section>
  );
}
