interface CreateRoomScreenProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export function CreateRoomScreen({
  nickname,
  onNicknameChange,
  onSubmit,
  onBack,
  loading,
}: CreateRoomScreenProps) {
  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-4 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Create Room</p>
          <h2 className="liquid-title mt-3 text-3xl sm:text-4xl">Open a live Psyblr room</h2>
          <p className="body-copy mt-3 max-w-2xl">
            Claim the black card pool as Player 1, get a room code from the server, and wait for the second player to
            join from their own screen.
          </p>
        </div>
        <button type="button" onClick={onBack} className="chrome-button chrome-button--ghost">
          Back
        </button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading && nickname.trim().length > 0) {
              onSubmit();
            }
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">Nickname</span>
            <input
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              maxLength={24}
              className="chrome-input"
              placeholder="Player 1 nickname"
              autoFocus
            />
          </label>

          <div className="rounded-[1.5rem] border border-white/50 bg-white/40 px-4 py-4 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
            Your room code appears in the lobby immediately after creation, where you can copy it and send it to the second player.
          </div>

          <button type="submit" disabled={loading || nickname.trim().length === 0} className="chrome-button min-w-[220px]">
            {loading ? 'Creating room...' : 'Create room'}
          </button>
        </form>

        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <span className="glass-chip glass-chip--gold">Player 1 seat</span>
          <p className="liquid-title mt-4 text-4xl">Black cards</p>
          <p className="body-copy mt-3">
            You will attack in odd rounds, build from spades and clubs only, and the server will authoritatively manage
            the room from the first draft onward.
          </p>
          <div className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>1. Create the room.</p>
            <p>2. Share the code from the lobby.</p>
            <p>3. Ready up when your opponent connects.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
