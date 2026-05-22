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
    <section className="liquid-panel liquid-panel--public screen-entrance phase-shell">
      <div className="phase-shell-header">
        <div>
          <span className="glass-chip glass-chip--public">Opening reveal</span>
          <h2 className="liquid-title mt-3 text-[clamp(2rem,4vw,3rem)]">Only the spend totals go public</h2>
          <p className="body-copy mt-2 max-w-3xl">
            The hidden hands stay private. This moment only exposes the opening spend total from each side.
          </p>
        </div>
        <button type="button" onClick={onContinue} disabled={busy || actionsDisabled} className="chrome-button min-w-[220px]">
          {actionsDisabled ? 'Reconnecting...' : busy ? 'Waiting...' : 'Ready for round 1'}
        </button>
      </div>

      <div className="phase-shell-body">
        <div className="phase-shell-aside">
          <div className="phase-stat-grid">
            {[localPlayer, opponentPlayer].filter(Boolean).map((player) => (
              <article key={player?.id} className="glass-stat">
                <p className="glass-stat-label">{player?.id === localPlayerId ? 'You spent' : `${player?.displayName} spent`}</p>
                <p className="glass-stat-value">{player?.startingSpend ?? '••'}</p>
              </article>
            ))}
          </div>

          <article className="phase-block">
            <p className="section-kicker">Opening read</p>
            <h3 className="liquid-title mt-2 text-2xl">{higherSpendCopy}</h3>
            <p className="body-copy mt-2">
              Spend totals are the only public clue before live cards begin to flip.
            </p>
          </article>
        </div>

        <div className="phase-shell-aside">
          <article className="phase-block phase-block--hero">
            <p className="section-kicker">Next transition</p>
            <h3 className="liquid-title mt-2 text-2xl">{firstAttacker?.displayName ?? 'Player 1'} attacks round 1</h3>
            <p className="body-copy mt-2">
              Once both players confirm this reveal, the room moves into the first hidden attack and defense lock.
            </p>
          </article>

          <article className="phase-block">
            <p className="section-kicker">Privacy check</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="glass-chip">Only totals are public</span>
              <span className="glass-chip">Cards stay hidden</span>
              <span className="glass-chip">Round 1 opens next</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
