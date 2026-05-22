interface JoinRoomScreenProps {
  nickname: string;
  roomCode: string;
  onNicknameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export function JoinRoomScreen({
  nickname,
  roomCode,
  onNicknameChange,
  onRoomCodeChange,
  onSubmit,
  onBack,
  loading,
}: JoinRoomScreenProps) {
  const isRoomCodeComplete = roomCode.trim().length === 6;

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-white/40 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Join Room</p>
          <h2 className="liquid-title mt-2 text-3xl sm:text-4xl">Enter an active Psyblr room</h2>
          <p className="body-copy mt-2 max-w-2xl">
            Join as Player 2, claim the red card pool, and connect to the same server-authoritative room using the host’s
            code.
          </p>
        </div>
        <button type="button" onClick={onBack} className="chrome-button chrome-button--ghost">
          Back
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading && nickname.trim().length > 0 && isRoomCodeComplete) {
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
              placeholder="Player 2 nickname"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">Room code</span>
            <input
              value={roomCode}
              onChange={(event) => onRoomCodeChange(event.target.value)}
              maxLength={6}
              className="chrome-input chrome-input--code"
              placeholder="ABC123"
              autoFocus={nickname.trim().length > 0}
            />
          </label>

          <div className="rounded-[1.5rem] border border-white/50 bg-white/40 px-4 py-4 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
            Codes are 6 characters and ignore spaces or punctuation. Join from a second browser window or device to keep hidden hands private.
          </div>

          <button
            type="submit"
            disabled={loading || nickname.trim().length === 0 || !isRoomCodeComplete}
            className="chrome-button min-w-[220px]"
          >
            {loading ? 'Joining room...' : 'Join room'}
          </button>
        </form>

        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <span className="glass-chip glass-chip--hidden">Player 2 seat</span>
          <p className="liquid-title mt-3 text-3xl">Red cards</p>
          <p className="body-copy mt-2">
            You defend round 1, build from hearts and diamonds only, and only your own hidden hand and budget details stay
            private on this client.
          </p>
          <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--ink-700)]">
            <p>1. Enter the host's room code.</p>
            <p>2. Join the live lobby.</p>
            <p>3. Ready up and wait for setup to begin.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
