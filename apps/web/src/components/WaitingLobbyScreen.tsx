import { useEffect, useState } from 'react';
import type { PlayerId } from '@psyblr/game-engine';
import type { PublicMatchStateView, PublicPlayerStateView } from '../lib/roomProtocol';

interface WaitingLobbyScreenProps {
  roomState: PublicMatchStateView;
  localPlayerId: PlayerId;
  connectionLabel: string;
  onReadyToggle: (ready: boolean) => void;
  busy: boolean;
  actionsDisabled: boolean;
}

function findPlayer(roomState: PublicMatchStateView, playerId: PlayerId): PublicPlayerStateView | null {
  return roomState.players.find((player) => player.id === playerId) ?? null;
}

function getPoolLabel(player: PublicPlayerStateView | null): string {
  if (!player) {
    return 'Open seat';
  }

  return player.color === 'black' ? 'Black pool' : 'Red pool';
}

export function WaitingLobbyScreen({
  roomState,
  localPlayerId,
  connectionLabel,
  onReadyToggle,
  busy,
  actionsDisabled,
}: WaitingLobbyScreenProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const localPlayer = findPlayer(roomState, localPlayerId);
  const opponentId = localPlayerId === 'player1' ? 'player2' : 'player1';
  const opponentPlayer = findPlayer(roomState, opponentId);
  const localReady = Boolean(localPlayer?.ready);
  const readyCount = roomState.players.filter((player) => player.ready).length;
  const connectedCount = roomState.players.filter((player) => player.connected).length;
  const bothConnected = connectedCount === 2;
  const bothReady = readyCount === 2;
  const roleLabel = roomState.attacker === localPlayerId ? 'Attack first' : 'Defend first';

  let statusTitle = 'Ready check is open';
  let statusCopy = 'When both players hit ready, the hidden starting draft opens.';

  if (!opponentPlayer) {
    statusTitle = 'Waiting for the second player';
    statusCopy = 'Share the room code and keep this tab open.';
  } else if (!opponentPlayer.connected) {
    statusTitle = `${opponentPlayer.displayName} is offline`;
    statusCopy = 'Their seat is still reserved and the room will resume when they reconnect.';
  } else if (bothReady) {
    statusTitle = 'Both seats are ready';
    statusCopy = 'The opening draft unlocks immediately.';
  } else if (localReady) {
    statusTitle = `Waiting for ${opponentPlayer.displayName}`;
    statusCopy = 'Your ready check is locked in. The room advances as soon as they confirm.';
  } else if (opponentPlayer.ready) {
    statusTitle = `${opponentPlayer.displayName} is ready`;
    statusCopy = 'Hit ready and the room will move forward right away.';
  }

  async function handleCopyRoomCode() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance flex h-full min-h-0 flex-col overflow-auto px-4 py-4 sm:px-5 md:overflow-hidden">
      <div className="border-b border-white/40 pb-3">
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip glass-chip--public">Waiting lobby</span>
          <span className="glass-chip hidden sm:inline-flex">Room setup</span>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="liquid-title text-[clamp(1.15rem,4vw,1.95rem)] leading-tight">
              Bring in the second seat and lock the ready check
            </h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--ink-700)]">
              Share code, seat the guest, then both players ready up.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <div className="flex flex-wrap gap-2">
              <span className="glass-chip">{connectionLabel}</span>
              <span className={`glass-chip ${bothConnected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                {bothConnected ? 'Both connected' : 'Waiting on seat'}
              </span>
              <span className={`glass-chip ${localReady ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                {localReady ? 'You are ready' : 'You are not ready'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onReadyToggle(!localReady)}
              disabled={busy || actionsDisabled || !localPlayer}
              className="chrome-button min-w-[150px]"
            >
              {busy ? 'Updating...' : localReady ? 'Undo ready' : 'Ready up'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 pt-3 md:hidden">
        <article className="phase-block">
          <div className="flex flex-wrap gap-2">
            <span className="glass-chip">{connectionLabel}</span>
            <span className={`glass-chip ${bothConnected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
              {bothConnected ? 'Both connected' : 'Waiting on seat'}
            </span>
            <span className={`glass-chip ${localReady ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
              {localReady ? 'You are ready' : 'You are not ready'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onReadyToggle(!localReady)}
            disabled={busy || actionsDisabled || !localPlayer}
            className="chrome-button mt-3 w-full"
          >
            {busy ? 'Updating...' : localReady ? 'Undo ready' : 'Ready up'}
          </button>
        </article>

        <article className="phase-block phase-block--hero">
          <p className="section-kicker">Room code</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="liquid-title text-[clamp(1.75rem,9vw,2.6rem)] leading-none tracking-[-0.06em]">{roomState.roomCode}</p>
            <button type="button" onClick={handleCopyRoomCode} className="chrome-button min-w-[150px]">
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">{statusCopy}</p>
        </article>

        <article className="phase-block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Status</p>
              <h3 className="liquid-title mt-1 text-lg leading-tight">{statusTitle}</h3>
            </div>
            <span className="glass-chip glass-chip--public">Lobby</span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-[1rem] border border-white/45 bg-white/38 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="glass-chip">{localPlayer?.displayName ?? 'Your seat'}</span>
                    <span className={`glass-chip ${localPlayer?.color === 'black' ? 'glass-chip--gold' : 'glass-chip--hidden'}`}>
                      {getPoolLabel(localPlayer)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--ink-950)]">{roleLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`glass-chip ${localPlayer?.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                    {localPlayer?.connected ? 'Connected' : 'Offline'}
                  </span>
                  <span className={`glass-chip ${localReady ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                    {localReady ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1rem] border border-white/45 bg-white/38 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="glass-chip">{opponentPlayer?.displayName ?? 'Open seat'}</span>
                    <span className={`glass-chip ${opponentPlayer ? 'glass-chip--hidden' : 'glass-chip--gold'}`}>
                      {opponentPlayer ? getPoolLabel(opponentPlayer) : 'Open seat'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--ink-950)]">
                    {opponentPlayer ? 'Seat assigned' : 'Waiting for opponent'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`glass-chip ${opponentPlayer?.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                    {opponentPlayer?.connected ? 'Connected' : 'Waiting'}
                  </span>
                  <span className={`glass-chip ${opponentPlayer?.ready ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                    {opponentPlayer?.ready ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <article className="glass-stat">
              <p className="glass-stat-label">Seats</p>
              <p className="glass-stat-value">{roomState.players.length}/2</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Ready</p>
              <p className="glass-stat-value">{readyCount}/2</p>
            </article>
          </div>
        </article>
      </div>

      <div className="hidden min-h-0 flex-1 gap-3 pt-3 md:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
        <div className="grid min-h-0 gap-3 content-start">
          <article className="phase-block phase-block--hero">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="section-kicker">Room code</p>
                <p className="liquid-title mt-2 text-[clamp(1.8rem,5vw,3rem)] leading-none tracking-[-0.06em]">
                  {roomState.roomCode}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">
                  Send it to the guest and keep this room open.
                </p>
              </div>

              <button type="button" onClick={handleCopyRoomCode} className="chrome-button min-w-[170px]">
                {copied ? 'Copied' : 'Copy room code'}
              </button>
            </div>
          </article>

          <article className="phase-block">
            <div className="space-y-3">
              <div className="rounded-[1rem] border border-white/45 bg-white/38 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="glass-chip">{localPlayer?.displayName ?? 'Your seat'}</span>
                      <span className={`glass-chip ${localPlayer?.color === 'black' ? 'glass-chip--gold' : 'glass-chip--hidden'}`}>
                        {getPoolLabel(localPlayer)}
                      </span>
                    </div>
                    <p className="section-kicker mt-3">Local seat</p>
                    <h3 className="liquid-title mt-1 text-lg">{roleLabel}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`glass-chip ${localPlayer?.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                      {localPlayer?.connected ? 'Connected' : 'Offline'}
                    </span>
                    <span className={`glass-chip ${localReady ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                      {localReady ? 'Ready' : 'Not ready'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1rem] border border-white/45 bg-white/38 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="glass-chip">{opponentPlayer?.displayName ?? 'Open seat'}</span>
                      <span className={`glass-chip ${opponentPlayer ? 'glass-chip--hidden' : 'glass-chip--gold'}`}>
                        {opponentPlayer ? getPoolLabel(opponentPlayer) : 'Open seat'}
                      </span>
                    </div>
                    <p className="section-kicker mt-3">Opponent seat</p>
                    <h3 className="liquid-title mt-1 text-lg">{opponentPlayer ? 'Seat assigned' : 'Waiting for opponent'}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`glass-chip ${opponentPlayer?.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                      {opponentPlayer?.connected ? 'Connected' : 'Waiting'}
                    </span>
                    <span className={`glass-chip ${opponentPlayer?.ready ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                      {opponentPlayer?.ready ? 'Ready' : 'Not ready'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <article className="phase-block flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Status</p>
              <h3 className="liquid-title mt-2 text-[clamp(1.1rem,3vw,1.6rem)] leading-tight">{statusTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">{statusCopy}</p>
            </div>
            <span className="glass-chip glass-chip--public">Lobby</span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <article className="glass-stat">
              <p className="glass-stat-label">Seats</p>
              <p className="glass-stat-value">{roomState.players.length}/2</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Ready</p>
              <p className="glass-stat-value">{readyCount}/2</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Role</p>
              <p className="glass-stat-value">{roomState.attacker === localPlayerId ? 'Attack' : 'Defend'}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Room</p>
              <p className="glass-stat-value">Live</p>
            </article>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="glass-chip glass-chip--public">Server authoritative</span>
            <span className="glass-chip">Private hand local</span>
            <span className="glass-chip">{bothReady ? 'Draft next' : 'Waiting room'}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
