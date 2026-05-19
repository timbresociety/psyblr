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
    detail: 'Only your own browser sees your hand, your remaining pool, and your budget pressure.',
    tone: 'glass-chip--hidden',
  },
  {
    label: 'Server Authority',
    detail: 'The backend resolves each round, guards the room, and keeps the public scoreline clean.',
    tone: 'glass-chip--public',
  },
  {
    label: '10-Round Arc',
    detail: 'Secret starting hands, five replenishment turns, wickets, and a decisive final reveal.',
    tone: 'glass-chip--gold',
  },
];

export function HomeScreen({
  nickname,
  onNicknameChange,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
}: HomeScreenProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(340px,0.92fr)]">
      <section className="liquid-panel liquid-panel--hero screen-entrance px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-chip glass-chip--public">Premium online strategy game</span>
          <span className="glass-chip glass-chip--gold">2-player live rooms</span>
        </div>

        <div className="mt-6">
          <p className="section-kicker">Liquid Chrome Edition</p>
          <div className="mt-4">
            <BrandWordmark size="hero" />
          </div>
          <p className="body-copy mt-5 max-w-2xl">
            Psyblr turns the original hidden-card duel into a real online room experience. Create a room, share the
            code, and let the server run the match while each player keeps their own hand private.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="flex flex-col gap-2">
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
          <button type="button" onClick={onCreateRoom} className="chrome-button min-w-[190px]">
            Create room
          </button>
          <button type="button" onClick={onJoinRoom} className="chrome-button chrome-button--ghost min-w-[190px]">
            Join room
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onOpenRules} className="chrome-button chrome-button--ghost">
            Rules and flow
          </button>
          <p className="text-sm leading-6 text-[color:var(--ink-700)]">
            Separate screens recommended. Desktop-first, but comfortable on tablet and large phones.
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
          <p className="section-kicker">Live Match Format</p>
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
              <p className="glass-stat-label">Opening Draft</p>
              <p className="glass-stat-value">5 cards</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Midgame Buys</p>
              <p className="glass-stat-value">Rounds 1-5</p>
            </div>
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Room Flow</p>
              <h2 className="liquid-title mt-3 text-2xl">Create, join, reveal, resolve</h2>
            </div>
            <span className="glass-chip glass-chip--success">Realtime</span>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>1. Host creates a room and shares the short code.</p>
            <p>2. Guest joins from a separate browser session and both players ready up.</p>
            <p>3. The server guides setup, round locks, public reveals, replenishment, and final scoring.</p>
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-7">
          <p className="section-kicker">Quick Clarity</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>Player 1 drafts black cards only and attacks first.</p>
            <p>Player 2 drafts red cards only and defends first.</p>
            <p>Same rank means wicket, and that attacker can never score on future attack turns.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
