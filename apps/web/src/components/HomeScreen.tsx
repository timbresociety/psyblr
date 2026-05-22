import { BrandWordmark } from './BrandWordmark';

interface HomeScreenProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenRules: () => void;
}

const featureCards = [
  {
    label: 'Private By Design',
    detail: 'Only your own browser sees your hand, pool, and budget pressure.',
    tone: 'glass-chip--hidden',
  },
  {
    label: 'Server Authority',
    detail: 'The backend resolves every turn and keeps the room state honest.',
    tone: 'glass-chip--public',
  },
  {
    label: '10-Round Arc',
    detail: 'Five-card opening, five buys, wickets, and a final reveal.',
    tone: 'glass-chip--gold',
  },
];

const matchFacts = [
  { label: 'Budget', value: '69' },
  { label: 'Rounds', value: '10' },
  { label: 'Opening Draft', value: '5 cards' },
  { label: 'Midgame Buys', value: 'Rounds 1-5' },
];

export function HomeScreen({
  nickname,
  onNicknameChange,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
}: HomeScreenProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
      <section className="liquid-panel liquid-panel--hero screen-entrance px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-chip glass-chip--public">Premium online strategy game</span>
          <span className="glass-chip glass-chip--gold">2-player live rooms</span>
        </div>

        <div className="mt-5">
          <p className="section-kicker">Liquid Chrome Edition</p>
          <div className="mt-3">
            <BrandWordmark size="hero" />
          </div>
          <p className="body-copy mt-4 max-w-2xl">
            Create a room, share the code, and let the server run the match while each player keeps their own hand private.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="flex flex-col gap-2 lg:min-w-0">
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
              Nickname
            </span>
            <input
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              maxLength={24}
              className="chrome-input"
              placeholder="Pick a name for this device"
            />
          </label>
          <button type="button" onClick={onCreateRoom} className="chrome-button min-w-[170px]">
            Create room
          </button>
          <button type="button" onClick={onJoinRoom} className="chrome-button chrome-button--ghost min-w-[170px]">
            Join room
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onOpenRules} className="chrome-button chrome-button--ghost">
            Rules and flow
          </button>
          <p className="text-sm leading-6 text-[color:var(--ink-700)]">
            Separate screens keep hidden hands private.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.label} className="glass-stat">
              <span className={`glass-chip ${feature.tone}`}>{feature.label}</span>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">{feature.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <article className="liquid-panel liquid-panel--public screen-entrance px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Match Format</p>
              <h2 className="liquid-title mt-2 text-2xl">Compact room setup</h2>
            </div>
            <span className="glass-chip glass-chip--success">Realtime</span>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-2">
            {matchFacts.map((fact) => (
              <div key={fact.label} className="glass-stat">
                <p className="glass-stat-label">{fact.label}</p>
                <p className="glass-stat-value text-2xl">{fact.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral screen-entrance px-5 py-5">
          <p className="section-kicker">Quick Clarity</p>
          <div className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>Player 1 drafts black cards and attacks first.</p>
            <p>Player 2 drafts red cards and defends first.</p>
            <p>Same rank means wicket, and that attacker can never score again on offense.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
