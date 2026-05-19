import type { PlayerId } from '@psyblr/game-engine';
import type { PrivatePlayerStateView, PublicMatchStateView, PublicPlayerStateView } from '../lib/roomProtocol';

interface ScoreboardProps {
  roomState: PublicMatchStateView | null;
  privateState: PrivatePlayerStateView | null;
  localPlayerId: PlayerId | null;
  connectionLabel: string;
}

function getPhaseLabel(phase: PublicMatchStateView['phase'] | null): string {
  switch (phase) {
    case 'lobby':
      return 'Waiting lobby';
    case 'setup':
      return 'Starting hand setup';
    case 'opening-reveal':
      return 'Opening spend reveal';
    case 'round':
      return 'Hidden round lock';
    case 'round-reveal':
      return 'Round result reveal';
    case 'replenishment':
      return 'Replenishment buy';
    case 'replenishment-reveal':
      return 'Replenishment sealed';
    case 'finished':
      return 'Final result';
    case null:
    default:
      return 'Syncing';
  }
}

function getPlayerById(roomState: PublicMatchStateView | null, playerId: PlayerId): PublicPlayerStateView | null {
  if (!roomState) {
    return null;
  }

  return roomState.players.find((player) => player.id === playerId) ?? null;
}

function getPhaseStatusCopy(roomState: PublicMatchStateView | null, localPlayerId: PlayerId | null): string {
  if (!roomState || !localPlayerId) {
    return 'Waiting for the first live room snapshot.';
  }

  const opponentPlayer = getPlayerById(roomState, localPlayerId === 'player1' ? 'player2' : 'player1');

  switch (roomState.phase) {
    case 'lobby':
      if (!opponentPlayer) {
        return 'Share the room code so the second seat can join.';
      }
      if (!opponentPlayer.connected) {
        return `${opponentPlayer.displayName} is away. The room will continue once they reconnect.`;
      }
      return 'Both players are in the room. Ready up to begin the opening draft.';
    case 'setup':
      return 'Both opening hands are being built privately. Only the spend totals will be revealed next.';
    case 'opening-reveal':
      return 'Opening spend is public now. Both players must confirm before round 1 begins.';
    case 'round':
      return roomState.attacker === localPlayerId
        ? 'You are the attacker this round. Beat the defense by value to score.'
        : 'You are defending this round. Match or beat the attack to shut the score down.';
    case 'round-reveal':
      return 'The server has flipped both cards. Confirm the reveal to move on.';
    case 'replenishment':
      return 'Both players get one hidden buy from their remaining color pool.';
    case 'replenishment-reveal':
      return 'Hidden buys are locked. One more confirmation starts the next round.';
    case 'finished':
      return 'The duel is complete. Review the public archive or start a fresh room.';
  }
}

export function Scoreboard({
  roomState,
  privateState,
  localPlayerId,
  connectionLabel,
}: ScoreboardProps) {
  const player1 = getPlayerById(roomState, 'player1');
  const player2 = getPlayerById(roomState, 'player2');
  const showOpeningSpend = roomState?.openingSpendRevealed ?? false;
  const statusCopy = getPhaseStatusCopy(roomState, localPlayerId);
  const roleLabel =
    roomState && localPlayerId
      ? roomState.phase === 'finished'
        ? 'Match complete'
        : roomState.attacker === localPlayerId
          ? 'You attack this round'
          : 'You defend this round'
      : 'Waiting for room sync';
  const localDisplayName =
    localPlayerId && roomState ? roomState.players.find((player) => player.id === localPlayerId)?.displayName : null;

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-4 border-b border-white/40 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Live Matchboard</p>
          <h2 className="liquid-title mt-3 text-3xl">Public score, private edge</h2>
          <p className="body-copy mt-3 max-w-3xl">
            {statusCopy}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="glass-chip glass-chip--public">{getPhaseLabel(roomState?.phase ?? null)}</span>
          <span className="glass-chip">{roomState ? `Room ${roomState.roomCode}` : 'Waiting for room'}</span>
          <span className="glass-chip">{connectionLabel}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
        <div className="liquid-panel liquid-panel--neutral px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="micro-copy">Live scoreline</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="liquid-title text-5xl sm:text-6xl">{player1?.score ?? 0}</span>
                <span className="liquid-title pb-1 text-2xl text-[color:var(--ink-500)]">:</span>
                <span className="liquid-title text-5xl sm:text-6xl">{player2?.score ?? 0}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
                {player1?.displayName ?? 'Player 1'} vs {player2?.displayName ?? 'Player 2'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass-stat min-w-[132px]">
                <p className="glass-stat-label">Round</p>
                <p className="glass-stat-value text-2xl">{roomState?.roundNumber ?? 1}</p>
              </div>
              <div className="glass-stat min-w-[132px]">
                <p className="glass-stat-label">Role</p>
                <p className="glass-stat-value text-xl">{roleLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="glass-chip">
              Attacker: {roomState?.attacker ? getPlayerById(roomState, roomState.attacker)?.displayName ?? roomState.attacker : 'Waiting'}
            </span>
            <span className="glass-chip">
              Defender: {roomState?.defender ? getPlayerById(roomState, roomState.defender)?.displayName ?? roomState.defender : 'Waiting'}
            </span>
            {privateState ? <span className="glass-chip glass-chip--gold">Your budget left {privateState.budgetRemaining}</span> : null}
            {privateState?.wicketed ? <span className="glass-chip glass-chip--hidden">You are wicketed</span> : null}
          </div>
        </div>

        <div className="liquid-panel liquid-panel--neutral px-5 py-5">
          <p className="micro-copy">Local private panel</p>
          <h3 className="liquid-title mt-3 text-2xl">{localDisplayName ?? 'Connecting player'}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-stat">
              <p className="glass-stat-label">Remaining budget</p>
              <p className="glass-stat-value text-2xl">{privateState?.budgetRemaining ?? '...'}</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Cards in hand</p>
              <p className="glass-stat-value text-2xl">{privateState?.handCardIds.length ?? '...'}</p>
            </div>
            <div className="glass-stat">
              <p className="glass-stat-label">Cards selected</p>
              <p className="glass-stat-value text-2xl">{privateState?.selectedCardIds.length ?? '...'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {([player1, player2] as const).map((player, index) => (
          <article key={player?.id ?? `seat-${index}`} className="liquid-panel liquid-panel--neutral px-5 py-5">
            {player ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="glass-chip">{player.displayName}</span>
                      <span className={`glass-chip ${player.color === 'black' ? 'glass-chip--gold' : 'glass-chip--hidden'}`}>
                        {player.color === 'black' ? 'Black pool' : 'Red pool'}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
                      {player.id === localPlayerId ? 'Your seat' : 'Opponent seat'}
                    </p>
                    <p className="liquid-title mt-2 text-5xl">{player.score}</p>
                  </div>

                  <div className="grid gap-2 text-right">
                    <span className={`glass-chip ${player.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                      {player.connected ? 'Connected' : 'Offline'}
                    </span>
                    <span className={`glass-chip ${player.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                      {player.wicketed ? 'Wicketed' : 'Live bat'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="glass-chip">Score {player.score}</span>
                  <span className="glass-chip">
                    Opening spend {showOpeningSpend ? player.startingSpend ?? 0 : 'Hidden'}
                  </span>
                  <span className="glass-chip">Cards selected {player.selectedCount}</span>
                </div>
              </>
            ) : (
              <>
                <span className="glass-chip glass-chip--gold">Open seat</span>
                <h3 className="liquid-title mt-4 text-3xl">Waiting for opponent</h3>
                <p className="body-copy mt-3">This room only starts once both seats are connected and ready.</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
