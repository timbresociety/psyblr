import { REPLENISHMENT_ROUNDS, TOTAL_ROUNDS, type Card, type PlayerId, type RoundRecord } from '@psyblr/game-engine';

interface RoundResultScreenProps {
  round: RoundRecord;
  cardsById: Record<string, Card>;
  localPlayerId: PlayerId;
  onContinue: () => void;
  busy: boolean;
  actionsDisabled?: boolean;
}

function RevealedCard({
  card,
  label,
  value,
}: {
  card: Card;
  label: string;
  value: number;
}) {
  return (
    <div className={`playing-card ${card.color === 'black' ? 'playing-card--black' : 'playing-card--red'} playing-card--compact px-4 py-4`}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="playing-card-corner">{label}</p>
          <p className="playing-card-rank mt-2">{card.shortLabel}</p>
          <p className="mt-2 text-sm leading-6 opacity-80">{card.displayLabel}</p>
        </div>
        <span className="playing-card-value">{value}</span>
      </div>
    </div>
  );
}

export function RoundResultScreen({
  round,
  cardsById,
  localPlayerId,
  onContinue,
  busy,
  actionsDisabled = false,
}: RoundResultScreenProps) {
  const localWasAttacker = round.attacker === localPlayerId;
  const outcomeTitle = round.wicket
    ? localWasAttacker
      ? 'You were wicketed on this exchange.'
      : 'You took the wicket.'
    : round.pointsScored > 0
      ? `${round.pointsScored} run${round.pointsScored === 1 ? '' : 's'} scored.`
      : 'Defense held. No runs scored.';
  const nextStepCopy =
    round.roundNumber === TOTAL_ROUNDS
      ? 'One more confirmation takes the room into the final result screen.'
      : round.roundNumber <= REPLENISHMENT_ROUNDS
        ? 'Next, both players make one hidden replenishment buy before the next round starts.'
        : 'Next, the room moves straight into the next secret attack and defense lock.';

  return (
    <section className={`liquid-panel ${round.wicket ? 'liquid-panel--hidden' : 'liquid-panel--public'} screen-entrance phase-shell`}>
      <div className="phase-shell-header">
        <div>
          <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--public'}`}>
            {round.wicket ? 'Wicket reveal' : 'Round reveal'}
          </span>
          <h2 className="liquid-title mt-3 text-[clamp(2rem,4vw,3rem)]">Round {round.roundNumber} resolved</h2>
          <p className="body-copy mt-2">{outcomeTitle}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-500)]">{nextStepCopy}</p>
        </div>
        <button type="button" onClick={onContinue} disabled={busy || actionsDisabled} className="chrome-button min-w-[220px]">
          {actionsDisabled ? 'Reconnecting...' : busy ? 'Waiting...' : 'Ready for next phase'}
        </button>
      </div>

      <div className="phase-shell-body">
        <div className="phase-shell-aside">
          <div className="phase-stat-grid">
            <article className="glass-stat">
              <p className="glass-stat-label">Attack value</p>
              <p className="glass-stat-value text-2xl">{round.attackCardValue}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Defense value</p>
              <p className="glass-stat-value text-2xl">{round.defenseCardValue}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Runs</p>
              <p className="glass-stat-value text-2xl">{round.wicket ? 'Wicket' : round.pointsScored}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Score</p>
              <p className="glass-stat-value text-2xl">
                {round.scoresAfterRound.player1}:{round.scoresAfterRound.player2}
              </p>
            </article>
          </div>

          <article className="phase-block">
            <p className="section-kicker">Reveal impact</p>
            <h3 className="liquid-title mt-2 text-2xl">
              {round.wicket
                ? 'The attacker is now shut out on future attack turns.'
                : round.pointsScored > 0
                  ? 'Clean value gap converted into runs.'
                  : 'No scoring edge broke through.'}
            </h3>
          </article>
        </div>

        <div className="phase-shell-aside">
          <RevealedCard
            card={cardsById[round.attackCardId]}
            label={round.attacker === localPlayerId ? 'Your attack' : 'Opponent attack'}
            value={round.attackCardValue}
          />
          <RevealedCard
            card={cardsById[round.defenseCardId]}
            label={round.defender === localPlayerId ? 'Your defense' : 'Opponent defense'}
            value={round.defenseCardValue}
          />
        </div>
      </div>
    </section>
  );
}
