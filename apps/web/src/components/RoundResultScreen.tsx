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
}: {
  card: Card;
  label: string;
}) {
  return (
    <div className={`playing-card ${card.color === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-5`}>
      <div className="relative z-10">
        <p className="playing-card-corner">{label}</p>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="playing-card-rank">{card.shortLabel}</p>
            <p className="mt-3 text-sm leading-6 opacity-80">{card.displayLabel}</p>
          </div>
          <span className="playing-card-value">{card.value}</span>
        </div>
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
    <section className={`liquid-panel ${round.wicket ? 'liquid-panel--hidden' : 'liquid-panel--public'} screen-entrance px-6 py-7 sm:px-8`}>
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--public'}`}>
            {round.wicket ? 'Wicket reveal' : 'Round reveal'}
          </span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">Round {round.roundNumber} resolved</h2>
          <p className="body-copy mt-3">{outcomeTitle}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-500)]">{nextStepCopy}</p>
        </div>
        <button type="button" onClick={onContinue} disabled={busy || actionsDisabled} className="chrome-button min-w-[220px]">
          {actionsDisabled ? 'Reconnecting...' : busy ? 'Waiting...' : 'Ready for next phase'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="glass-chip">Attack value {round.attackCardValue}</span>
        <span className="glass-chip">Defense value {round.defenseCardValue}</span>
        <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
          {round.wicket ? 'Wicket' : `${round.pointsScored} runs`}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevealedCard card={cardsById[round.attackCardId]} label={round.attacker === localPlayerId ? 'Your attack' : 'Opponent attack'} />
        <RevealedCard card={cardsById[round.defenseCardId]} label={round.defender === localPlayerId ? 'Your defense' : 'Opponent defense'} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <p className="micro-copy">Score after round</p>
          <div className="mt-3 flex items-end gap-3">
            <span className="liquid-title text-5xl">{round.scoresAfterRound.player1}</span>
            <span className="liquid-title pb-1 text-2xl text-[color:var(--ink-500)]">:</span>
            <span className="liquid-title text-5xl">{round.scoresAfterRound.player2}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
            {round.attacker === 'player1' ? 'Player 1 attacked this round.' : 'Player 2 attacked this round.'}
          </p>
        </article>
        <article className={`liquid-panel ${round.wicket ? 'liquid-panel--hidden' : 'liquid-panel--success'} px-5 py-5`}>
          <p className="micro-copy">Reveal impact</p>
          <h3 className="liquid-title mt-3 text-2xl">
            {round.wicket
              ? 'The attacker is now shut out on future attack turns.'
              : round.pointsScored > 0
                ? 'Clean value gap converted into runs.'
                : 'No scoring edge broke through.'}
          </h3>
          <p className="body-copy mt-3">
            {round.wicket
              ? 'The defender still has to survive future rounds, but the wicket permanently removes this attacker’s scoring threat on offense.'
              : 'Exact same rank remains the only way to trigger a wicket, so every future attack still carries that hidden risk.'}
          </p>
        </article>
      </div>
    </section>
  );
}
