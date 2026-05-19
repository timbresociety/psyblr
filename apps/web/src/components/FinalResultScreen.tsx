import type { Card, PlayerId } from '@psyblr/game-engine';
import type { PublicMatchStateView } from '../lib/roomProtocol';

interface FinalResultScreenProps {
  roomState: PublicMatchStateView;
  localPlayerId: PlayerId;
  cardsById: Record<string, Card>;
  onReturnHome: () => void;
  onStartRematch: () => void;
}

export function FinalResultScreen({
  roomState,
  localPlayerId,
  cardsById,
  onReturnHome,
  onStartRematch,
}: FinalResultScreenProps) {
  const localPlayer = roomState.players.find((player) => player.id === localPlayerId);
  const opponentPlayer = roomState.players.find((player) => player.id !== localPlayerId);
  const wickets = roomState.discardHistory.filter((round) => round.wicket).length;
  const scoreMargin =
    localPlayer && opponentPlayer ? Math.abs(localPlayer.score - opponentPlayer.score) : 0;
  const lastRound = roomState.discardHistory[roomState.discardHistory.length - 1] ?? null;
  const lastAttackCard = lastRound ? cardsById[lastRound.attackCardId] : null;
  const lastDefenseCard = lastRound ? cardsById[lastRound.defenseCardId] : null;
  const winnerText =
    roomState.winner === 'draw'
      ? 'The room ends level.'
      : roomState.winner === localPlayerId
        ? 'You win the match.'
        : 'The opponent takes the match.';
  const resultSubtitle =
    roomState.winner === 'draw'
      ? 'No one found a decisive edge across all 10 rounds.'
      : `${scoreMargin} run${scoreMargin === 1 ? '' : 's'} separated the final scoreline.`;

  return (
    <section className="liquid-panel liquid-panel--success screen-entrance px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Final Result</p>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">{winnerText}</h2>
          <p className="body-copy mt-3">{resultSubtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onStartRematch} className="chrome-button min-w-[190px]">
            Start rematch room
          </button>
          <button type="button" onClick={onReturnHome} className="chrome-button chrome-button--ghost min-w-[160px]">
            Return home
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <article className="glass-stat">
          <p className="glass-stat-label">Final margin</p>
          <p className="glass-stat-value">{roomState.winner === 'draw' ? 'Draw' : scoreMargin}</p>
        </article>
        <article className="glass-stat">
          <p className="glass-stat-label">Wickets</p>
          <p className="glass-stat-value">{wickets}</p>
        </article>
        <article className="glass-stat">
          <p className="glass-stat-label">Rounds revealed</p>
          <p className="glass-stat-value">{roomState.discardHistory.length}</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[localPlayer, opponentPlayer].filter(Boolean).map((player) => (
          <article key={player?.id} className="liquid-panel liquid-panel--neutral px-5 py-5">
            <span className="glass-chip">{player?.displayName}</span>
            <p className="liquid-title mt-4 text-5xl">{player?.score}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`glass-chip ${player?.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                Wicketed: {player?.wicketed ? 'Yes' : 'No'}
              </span>
              <span className="glass-chip">Starting spend {player?.startingSpend ?? '••'}</span>
            </div>
          </article>
        ))}
      </div>

      {lastRound && lastAttackCard && lastDefenseCard ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Last reveal</p>
            <h3 className="liquid-title mt-3 text-2xl">Round {lastRound.roundNumber} closed the room</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className={`playing-card ${lastAttackCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-4`}>
                <div className="relative z-10">
                  <p className="playing-card-corner">Attack card</p>
                  <p className="playing-card-rank mt-2">{lastAttackCard.shortLabel}</p>
                  <p className="mt-4 text-sm leading-6 opacity-80">Value {lastRound.attackCardValue}</p>
                </div>
              </div>
              <div className={`playing-card ${lastDefenseCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-4`}>
                <div className="relative z-10">
                  <p className="playing-card-corner">Defense card</p>
                  <p className="playing-card-rank mt-2">{lastDefenseCard.shortLabel}</p>
                  <p className="mt-4 text-sm leading-6 opacity-80">Value {lastRound.defenseCardValue}</p>
                </div>
              </div>
            </div>
          </article>
          <article className="liquid-panel liquid-panel--success px-5 py-5">
            <p className="micro-copy">Next move</p>
            <h3 className="liquid-title mt-3 text-2xl">Run it back in a fresh room</h3>
            <p className="body-copy mt-3">
              Psyblr does not reuse finished rooms. A rematch starts by creating a brand-new room code so the server can keep every duel authoritative from the opening draft.
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
