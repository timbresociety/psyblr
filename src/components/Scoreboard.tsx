import { TOTAL_ROUNDS, getAttackerForRound } from '../lib/game';
import type { GamePhase, PlayerState } from '../types/game';

interface ScoreboardProps {
  players: Record<'player1' | 'player2', PlayerState>;
  currentRound: number;
  phase: GamePhase;
  showStartingSpend: boolean;
}

function getPhaseLabel(phase: GamePhase): string {
  switch (phase.type) {
    case 'setup':
      return 'Starting hands';
    case 'pass':
      return 'Pass device';
    case 'starting-totals':
      return 'Opening spend reveal';
    case 'play':
      return `Round ${phase.roundNumber} ${phase.role}`;
    case 'round-result':
      return `Round ${phase.roundNumber} reveal`;
    case 'buy':
      return `Round ${phase.roundNumber} replenishment`;
    case 'game-over':
      return 'Match complete';
  }
}

export function Scoreboard({ players, currentRound, phase, showStartingSpend }: ScoreboardProps) {
  const publicAttacker = currentRound <= TOTAL_ROUNDS ? getAttackerForRound(currentRound) : null;
  const wicketLabels = [
    players.player1.wicketed ? 'P1' : null,
    players.player2.wicketed ? 'P2' : null,
  ].filter(Boolean);

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-4 border-b border-white/40 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Public Matchboard</p>
          <h2 className="liquid-title mt-3 text-3xl">Score and innings</h2>
          <p className="body-copy mt-3 max-w-3xl">
            {showStartingSpend
              ? 'Opening spend totals are public. Hidden cards and replenishment choices stay sealed until revealed by play.'
              : 'Before the reveal, both opening spends remain hidden from the shared screen.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="glass-chip glass-chip--public">{getPhaseLabel(phase)}</span>
          <span className="glass-chip">Round {Math.min(currentRound, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
          {phase.type !== 'game-over' ? (
            <span className="glass-chip glass-chip--gold">
              Attacker: {publicAttacker === 'player1' ? 'Player 1' : 'Player 2'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 liquid-panel liquid-panel--neutral px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="micro-copy">Live scoreline</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="liquid-title text-5xl sm:text-6xl">{players.player1.score}</span>
              <span className="liquid-title pb-1 text-2xl text-[color:var(--ink-500)]">:</span>
              <span className="liquid-title text-5xl sm:text-6xl">{players.player2.score}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`glass-chip ${phase.type === 'game-over' ? 'glass-chip--success' : 'glass-chip--gold'}`}>
              {phase.type === 'game-over'
                ? 'Match finished'
                : `Current attacker: ${publicAttacker === 'player1' ? 'Player 1' : 'Player 2'}`}
            </span>
            <span className="glass-chip">
              Wickets: {wicketLabels.length > 0 ? wicketLabels.join(' + ') : 'None'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {(['player1', 'player2'] as const).map((playerId) => {
          const player = players[playerId];
          const isAttacker = publicAttacker === playerId && phase.type !== 'game-over';

          return (
            <article
              key={player.id}
              className={`liquid-panel ${isAttacker ? 'liquid-panel--success' : 'liquid-panel--neutral'} px-5 py-5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="glass-chip">{player.name}</span>
                    <span className={`glass-chip ${player.color === 'black' ? 'glass-chip--gold' : 'glass-chip--hidden'}`}>
                      {player.color === 'black' ? 'Spades + Clubs' : 'Hearts + Diamonds'}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
                    {phase.type === 'game-over' ? 'Final score' : isAttacker ? 'Attacking this round' : 'Defending this round'}
                  </p>
                  <p className="liquid-title mt-2 text-5xl">{player.score}</p>
                </div>
                <div className="grid gap-3 text-right">
                  <div className="glass-stat min-w-[120px]">
                    <p className="glass-stat-label">Opening spend</p>
                    <p className="glass-stat-value text-2xl">{showStartingSpend ? player.startingSpend : '••'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`glass-chip ${player.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                  Wicketed: {player.wicketed ? 'Yes' : 'No'}
                </span>
                <span className="glass-chip">Score: {player.score}</span>
                <span className="glass-chip glass-chip--public">
                  {isAttacker ? 'Attacking' : phase.type === 'game-over' ? 'Final state' : 'Defending'}
                </span>
              </div>

              {player.wicketed ? (
                <p className="mt-4 text-sm leading-6 text-[color:var(--ink-700)]">
                  Future attack turns still reveal cards, but this player can no longer score on offense.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[color:var(--ink-700)]">
                  {isAttacker ? 'This player can score if attack beats defense by value.' : 'This player is trying to block runs or match rank for a wicket.'}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
