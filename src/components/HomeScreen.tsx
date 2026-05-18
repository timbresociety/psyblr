import { BrandWordmark } from './BrandWordmark';

interface HomeScreenProps {
  onStart: () => void;
  onOpenRules: () => void;
}

const featureCards = [
  {
    label: 'Hidden Draft',
    detail: 'Secret starting hands and replenishment buys keep every reveal dramatic.',
    tone: 'glass-chip--hidden',
  },
  {
    label: 'Budget Pressure',
    detail: 'Every pick has to fit the 69-point cap while still leaving room for later rounds.',
    tone: 'glass-chip--gold',
  },
  {
    label: 'Wicket Risk',
    detail: 'Match the same rank and the attacker loses all future scoring turns on offense.',
    tone: 'glass-chip--public',
  },
];

export function HomeScreen({ onStart, onOpenRules }: HomeScreenProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.95fr)]">
      <section className="liquid-panel liquid-panel--hero screen-entrance px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-chip glass-chip--public">Premium local strategy game</span>
          <span className="glass-chip glass-chip--hidden">Pass-device play</span>
        </div>

        <div className="mt-6">
          <p className="section-kicker">Liquid Chrome Edition</p>
          <div className="mt-4">
            <BrandWordmark size="hero" />
          </div>
          <p className="body-copy mt-5 max-w-2xl">
            A glossy, face-to-face card duel where both players build within budget, hide their hands, and trade
            precise attacks across 10 rounds.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button type="button" onClick={onStart} className="chrome-button min-w-[220px]">
            Start local match
          </button>
          <button type="button" onClick={onOpenRules} className="chrome-button chrome-button--ghost min-w-[180px]">
            Rules and flow
          </button>
          <p className="text-sm leading-6 text-[color:var(--ink-700)]">
            Best on desktop or tablet. The hidden-info flow stays protected with pass screens before every secret step.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.label} className="glass-stat">
              <span className={`glass-chip ${feature.tone}`}>{feature.label}</span>
              <p className="mt-4 text-sm leading-6 text-[color:var(--ink-700)]">{feature.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <article className="liquid-panel liquid-panel--public screen-entrance px-6 py-7">
          <p className="section-kicker">Match Format</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-stat">
              <p className="glass-stat-label">Budget</p>
              <p className="glass-stat-value">69</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Rounds</p>
              <p className="glass-stat-value">10</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Secret Start</p>
              <p className="glass-stat-value">5 cards</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Midgame Buys</p>
              <p className="glass-stat-value">5 rounds</p>
            </div>
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Preview Surface</p>
              <h2 className="liquid-title mt-3 text-2xl">Tactile cards, clean reveals</h2>
            </div>
            <span className="glass-chip glass-chip--success">No backend</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="playing-card playing-card--black px-4 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="playing-card-corner">Black pool</p>
                  <p className="playing-card-rank mt-3">K♠</p>
                </div>
                <span className="playing-card-value">10</span>
              </div>
              <p className="mt-6 text-sm leading-6 opacity-80">Strong value, but it still eats budget.</p>
            </div>
            <div className="playing-card playing-card--red px-4 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="playing-card-corner">Red pool</p>
                  <p className="playing-card-rank mt-3">Q♥</p>
                </div>
                <span className="playing-card-value">10</span>
              </div>
              <p className="mt-6 text-sm leading-6 opacity-80">Same-rank reveal means wicket and instant pressure.</p>
            </div>
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-7">
          <p className="section-kicker">First Test Checklist</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>1. Start the match and keep the device private on hidden screens.</p>
            <p>2. Use the pass screens as your safe handoff moments.</p>
            <p>3. Watch the public board for attacker, defender, scoreline, and wicket status.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
