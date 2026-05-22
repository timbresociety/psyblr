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
    <section className="liquid-panel liquid-panel--success screen-entrance phase-shell">
      <div className="phase-shell-header">
        <div>
          <p className="section-kicker">Final result</p>
          <h2 className="liquid-title mt-3 text-[clamp(2rem,4vw,3rem)]">{winnerText}</h2>
          <p className="body-copy mt-2">{resultSubtitle}</p>
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

      <div className="phase-shell-body">
        <div className="phase-shell-aside">
          <div className="phase-stat-grid">
            <article className="glass-stat">
              <p className="glass-stat-label">Final margin</p>
              <p className="glass-stat-value">{roomState.winner === 'draw' ? 'Draw' : scoreMargin}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Wickets</p>
              <p className="glass-stat-value">{wickets}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Rounds</p>
              <p className="glass-stat-value">{roomState.discardHistory.length}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Winner</p>
              <p className="glass-stat-value text-2xl">
                {roomState.winner === 'draw' ? 'Draw' : roomState.winner === localPlayerId ? 'You' : 'Opponent'}
              </p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[localPlayer, opponentPlayer].filter(Boolean).map((player) => (
              <article key={player?.id} className="seat-card">
                <span className="glass-chip">{player?.displayName}</span>
                <p className="liquid-title mt-3 text-4xl">{player?.score}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`glass-chip ${player?.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                    {player?.wicketed ? 'Wicketed' : 'Live bat'}
                  </span>
                  <span className="glass-chip">Spend {player?.startingSpend ?? '••'}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="phase-shell-aside">
          {lastRound && lastAttackCard && lastDefenseCard ? (
            <article className="phase-block phase-block--hero">
              <p className="section-kicker">Last reveal</p>
              <h3 className="liquid-title mt-2 text-2xl">Round {lastRound.roundNumber} closed the room</h3>
              <div className="mt-4 grid gap-3">
                <div className={`playing-card ${lastAttackCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} playing-card--compact px-4 py-4`}>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div>
                      <p className="playing-card-corner">Attack card</p>
                      <p className="playing-card-rank mt-2">{lastAttackCard.shortLabel}</p>
                    </div>
                    <span className="playing-card-value">{lastRound.attackCardValue}</span>
                  </div>
                </div>
                <div className={`playing-card ${lastDefenseCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} playing-card--compact px-4 py-4`}>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div>
                      <p className="playing-card-corner">Defense card</p>
                      <p className="playing-card-rank mt-2">{lastDefenseCard.shortLabel}</p>
                    </div>
                    <span className="playing-card-value">{lastRound.defenseCardValue}</span>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <article className="phase-block">
              <p className="section-kicker">Room summary</p>
              <h3 className="liquid-title mt-2 text-2xl">All 10 rounds are resolved</h3>
            </article>
          )}

          <article className="phase-block">
            <p className="section-kicker">Next move</p>
            <h3 className="liquid-title mt-2 text-2xl">Run it back in a fresh room</h3>
            <p className="body-copy mt-2">
              Psyblr does not reuse finished rooms, so a rematch starts from a brand-new authoritative room code.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
