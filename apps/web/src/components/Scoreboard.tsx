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
      return 'Waiting Lobby';
    case 'setup':
      return 'Starting Draft';
    case 'opening-reveal':
      return 'Opening Reveal';
    case 'round':
      return 'Card Lock';
    case 'round-reveal':
      return 'Round Reveal';
    case 'replenishment':
      return 'Replenishment';
    case 'replenishment-reveal':
      return 'Replenishment Locked';
    case 'finished':
      return 'Final Result';
    case null:
    default:
      return 'Connecting';
  }
}

function getPlayerById(roomState: PublicMatchStateView | null, playerId: PlayerId): PublicPlayerStateView | null {
  if (!roomState) {
    return null;
  }

  return roomState.players.find((player) => player.id === playerId) ?? null;
}

export function Scoreboard({
  roomState,
  privateState,
  localPlayerId,
  connectionLabel,
}: ScoreboardProps) {
  const player1 = getPlayerById(roomState, 'player1');
  const player2 = getPlayerById(roomState, 'player2');
  const localPlayer = localPlayerId ? getPlayerById(roomState, localPlayerId) : null;
  const roleLabel =
    roomState && localPlayerId
      ? roomState.phase === 'finished'
        ? 'Complete'
        : roomState.attacker === localPlayerId
          ? 'Attacking'
          : 'Defending'
      : 'Waiting';
  const seats = [player1, player2];

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3 border-b border-white/40 pb-3">
        <div>
          <p className="section-kicker">Matchboard</p>
          <p className="mt-1 text-sm leading-6 text-[color:var(--ink-700)]">{getPhaseLabel(roomState?.phase ?? null)}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <span className="glass-chip">{connectionLabel}</span>
          {roomState ? <span className="glass-chip glass-chip--public">R{roomState.roundNumber}</span> : null}
        </div>
      </div>

      <article className="phase-block phase-block--hero mt-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-end gap-2">
              <span className="liquid-title text-[clamp(1.8rem,4vw,2.6rem)] leading-none">{player1?.score ?? 0}</span>
              <span className="liquid-title pb-1 text-base text-[color:var(--ink-500)]">:</span>
              <span className="liquid-title text-[clamp(1.8rem,4vw,2.6rem)] leading-none">{player2?.score ?? 0}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">
              {player1?.displayName ?? 'Player 1'} vs {player2?.displayName ?? 'Player 2'}
            </p>
          </div>

          <span className="glass-chip glass-chip--gold">{localPlayer?.displayName ?? 'Seat syncing'}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <article className="glass-stat">
            <p className="glass-stat-label">Round</p>
            <p className="glass-stat-value">{roomState?.roundNumber ?? 1}</p>
          </article>
          <article className="glass-stat">
            <p className="glass-stat-label">Role</p>
            <p className="glass-stat-value">{roleLabel}</p>
          </article>
          <article className="glass-stat">
            <p className="glass-stat-label">Hand</p>
            <p className="glass-stat-value">{privateState?.handCardIds.length ?? '...'}</p>
          </article>
          <article className="glass-stat">
            <p className="glass-stat-label">Budget</p>
            <p className="glass-stat-value">{privateState?.budgetRemaining ?? '...'}</p>
          </article>
        </div>
      </article>

      <div className="sidebar-seat-list mt-3">
        {seats.map((player, index) => (
          <article key={player?.id ?? `seat-${index}`} className="sidebar-seat-row">
            {player ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[color:var(--ink-950)]">{player.displayName}</p>
                      <span className={`glass-chip ${player.color === 'black' ? 'glass-chip--gold' : 'glass-chip--hidden'}`}>
                        {player.color === 'black' ? 'Black pool' : 'Red pool'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
                      {player.id === localPlayerId ? 'Your seat' : 'Opponent seat'}
                    </p>
                  </div>
                  <p className="liquid-title text-xl leading-none">{player.score}</p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`glass-chip ${player.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                    {player.connected ? 'Connected' : 'Offline'}
                  </span>
                  <span className={`glass-chip ${player.ready ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                    {player.ready ? 'Ready' : 'Not ready'}
                  </span>
                  {player.id === localPlayerId && privateState ? (
                    <span className={`glass-chip ${privateState.wicketed ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
                      {privateState.wicketed ? 'Wicketed' : 'Live bat'}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="glass-chip glass-chip--gold">Open seat</span>
                    <h3 className="mt-2 text-base font-semibold text-[color:var(--ink-950)]">Waiting for opponent</h3>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/40 pt-3">
        {roomState ? <span className="glass-chip">Room {roomState.roomCode}</span> : null}
        {localPlayer ? <span className="glass-chip">{localPlayer.displayName}</span> : null}
        <span className="glass-chip">Selected {privateState?.selectedCardIds.length ?? 0}</span>
      </div>
    </section>
  );
}
