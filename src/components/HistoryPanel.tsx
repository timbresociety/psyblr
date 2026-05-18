import type { Card, RoundRecord } from '../types/game';

interface HistoryPanelProps {
  history: RoundRecord[];
  cardsById: Record<string, Card>;
}

export function HistoryPanel({ history, cardsById }: HistoryPanelProps) {
  return (
    <section className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Public Archive</p>
          <h2 className="liquid-title mt-3 text-2xl">Round history</h2>
          <p className="body-copy mt-3 max-w-xl">Every revealed card pair stays here after the reveal screen has been shown.</p>
        </div>
        <span className="glass-chip glass-chip--public">{history.length} rounds revealed</span>
      </div>

      {history.length === 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-white/50 bg-white/40 px-5 py-6 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          Nothing public yet. Hidden picks stay protected until the first round result is revealed.
        </div>
      ) : (
        <div className="timeline-list mt-6">
          {history.map((round) => {
            const attackCard = cardsById[round.attackCardId];
            const defenseCard = cardsById[round.defenseCardId];

            return (
              <article key={round.roundNumber} className="timeline-item">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
                      Round {round.roundNumber}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink-950)]">
                      {round.attacker === 'player1' ? 'Player 1 attacked' : 'Player 2 attacked'}
                    </h3>
                  </div>
                  <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                    {round.wicket ? 'Wicket' : `${round.pointsScored} runs`}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className={`playing-card ${attackCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-4`}>
                    <div className="relative z-10">
                      <p className="playing-card-corner">Attack reveal</p>
                      <p className="playing-card-rank mt-2">{attackCard.shortLabel}</p>
                      <p className="mt-4 text-sm leading-6 opacity-80">Value {round.attackCardValue}</p>
                    </div>
                  </div>
                  <div className={`playing-card ${defenseCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-4`}>
                    <div className="relative z-10">
                      <p className="playing-card-corner">Defense reveal</p>
                      <p className="playing-card-rank mt-2">{defenseCard.shortLabel}</p>
                      <p className="mt-4 text-sm leading-6 opacity-80">Value {round.defenseCardValue}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
