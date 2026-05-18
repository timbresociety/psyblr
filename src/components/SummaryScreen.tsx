import type { Card, PlayerState, RoundRecord, Winner } from '../types/game';
import { BrandWordmark } from './BrandWordmark';

interface SummaryScreenProps {
  winner: Winner;
  players: Record<'player1' | 'player2', PlayerState>;
  history: RoundRecord[];
  cardsById: Record<string, Card>;
  onRestart: () => void;
  onReturnHome: () => void;
}

export function SummaryScreen({
  winner,
  players,
  history,
  cardsById,
  onRestart,
  onReturnHome,
}: SummaryScreenProps) {
  const margin = Math.abs(players.player1.score - players.player2.score);
  const winnerText =
    winner === 'draw' ? 'The match ends level.' : `${winner === 'player1' ? 'Player 1' : 'Player 2'} takes the win.`;
  const winnerSubtext =
    winner === 'draw'
      ? 'Both players finished on exactly the same total.'
      : `Winning margin: ${margin} run${margin === 1 ? '' : 's'}.`;

  return (
    <section className="liquid-panel liquid-panel--success screen-entrance px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Final Reveal</p>
          <div className="mt-4">
            <BrandWordmark />
          </div>
          <h2 className="liquid-title mt-5 text-3xl sm:text-4xl">{winnerText}</h2>
          <p className="body-copy mt-3">{winnerSubtext}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onRestart} className="chrome-button min-w-[180px]">
            Play rematch
          </button>
          <button type="button" onClick={onReturnHome} className="chrome-button chrome-button--ghost min-w-[160px]">
            Return home
          </button>
        </div>
      </div>

      <div className="mt-6 liquid-panel liquid-panel--neutral px-5 py-5">
        <p className="micro-copy">Final scoreline</p>
        <div className="mt-3 flex items-end gap-3">
          <span className="liquid-title text-5xl sm:text-6xl">{players.player1.score}</span>
          <span className="liquid-title pb-1 text-2xl text-[color:var(--ink-500)]">:</span>
          <span className="liquid-title text-5xl sm:text-6xl">{players.player2.score}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(['player1', 'player2'] as const).map((playerId) => {
          const player = players[playerId];

          return (
            <article key={player.id} className="liquid-panel liquid-panel--neutral px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="glass-chip">{player.name}</span>
                  <p className="liquid-title mt-4 text-4xl">{player.score}</p>
                </div>
                <span className={`glass-chip ${player.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                  Wicketed: {player.wicketed ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="glass-chip glass-chip--public">Opening spend {player.startingSpend}</span>
                <span className="glass-chip">Color pool {player.color === 'black' ? 'Black' : 'Red'}</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-[color:var(--ink-700)]">
                {player.wicketed
                  ? 'This player finished the match with attack scoring disabled after a wicket.'
                  : 'This player stayed live on offense for the full match.'}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Public timeline</p>
            <h3 className="liquid-title mt-2 text-2xl">All revealed rounds</h3>
          </div>
          <span className="glass-chip glass-chip--public">{history.length} rounds logged</span>
        </div>

        <div className="timeline-list mt-5">
          {history.map((round) => (
            <div key={round.roundNumber} className="timeline-item">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                  Round {round.roundNumber}
                </p>
                <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                  {round.wicket ? 'Wicket, 0 runs' : `${round.pointsScored} runs`}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
                {round.attacker === 'player1' ? 'P1' : 'P2'} attacked with{' '}
                <strong>{cardsById[round.attackCardId].shortLabel}</strong> against{' '}
                <strong>{cardsById[round.defenseCardId].shortLabel}</strong>.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
