import { useEffect, useState } from 'react';
import type { Card, RoundRecord } from '@psyblr/game-engine';

interface HistoryPanelProps {
  history: RoundRecord[];
  cardsById: Record<string, Card>;
}

export function HistoryPanel({ history, cardsById }: HistoryPanelProps) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(history.length - 1, 0));

  useEffect(() => {
    if (history.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((currentIndex) => {
      if (currentIndex >= history.length) {
        return history.length - 1;
      }

      return currentIndex;
    });
  }, [history.length]);

  const activeRound = history[activeIndex] ?? null;
  const activeAttackCard = activeRound ? cardsById[activeRound.attackCardId] : null;
  const activeDefenseCard = activeRound ? cardsById[activeRound.defenseCardId] : null;

  return (
    <section className="liquid-panel liquid-panel--neutral screen-entrance flex h-full min-h-0 flex-col px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3 border-b border-white/40 pb-3">
        <div>
          <p className="section-kicker">Public archive</p>
          <h2 className="liquid-title mt-2 text-2xl">Reveal viewer</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="glass-chip glass-chip--public">{history.length} rounds</span>
          {activeRound ? <span className="glass-chip">R{activeRound.roundNumber}</span> : null}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-3 rounded-[1.5rem] border border-white/50 bg-white/40 px-4 py-5 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          No public reveals yet. Once the first round flips, the archive will stay available here without taking over the play view.
        </div>
      ) : activeRound && activeAttackCard && activeDefenseCard ? (
        <div className="surface-scroll mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {history.map((round, index) => (
              <button
                key={round.roundNumber}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`archive-chip ${index === activeIndex ? 'archive-chip--active' : ''}`}
              >
                R{round.roundNumber}
              </button>
            ))}
          </div>

          <article className="phase-block">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Round {activeRound.roundNumber}</p>
                <h3 className="liquid-title mt-2 text-xl">
                  {activeRound.attacker === 'player1' ? 'Player 1 attacked' : 'Player 2 attacked'}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`glass-chip ${activeRound.wicket ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                  {activeRound.wicket ? 'Wicket' : `${activeRound.pointsScored} runs`}
                </span>
                <span className="glass-chip">
                  {activeRound.scoresAfterRound.player1}:{activeRound.scoresAfterRound.player2}
                </span>
              </div>
            </div>
          </article>

          <div className="grid gap-3">
            <div className={`playing-card ${activeAttackCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} playing-card--compact px-4 py-4`}>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="playing-card-corner">Attack reveal</p>
                  <p className="playing-card-rank mt-2">{activeAttackCard.shortLabel}</p>
                </div>
                <span className="playing-card-value">{activeRound.attackCardValue}</span>
              </div>
            </div>

            <div className={`playing-card ${activeDefenseCard.color === 'black' ? 'playing-card--black' : 'playing-card--red'} playing-card--compact px-4 py-4`}>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="playing-card-corner">Defense reveal</p>
                  <p className="playing-card-rank mt-2">{activeDefenseCard.shortLabel}</p>
                </div>
                <span className="playing-card-value">{activeRound.defenseCardValue}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
              disabled={activeIndex === 0}
              className="chrome-button chrome-button--ghost w-full"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((currentIndex) => Math.min(currentIndex + 1, history.length - 1))}
              disabled={activeIndex === history.length - 1}
              className="chrome-button chrome-button--ghost w-full"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
