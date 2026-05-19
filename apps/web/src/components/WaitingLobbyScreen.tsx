import { useEffect, useState } from 'react';
import type { PlayerId } from '@psyblr/game-engine';
import type { PublicMatchStateView, PublicPlayerStateView } from '../lib/roomProtocol';

interface WaitingLobbyScreenProps {
  roomState: PublicMatchStateView;
  localPlayerId: PlayerId;
  connectionLabel: string;
  onReadyToggle: (ready: boolean) => void;
  busy: boolean;
  actionsDisabled?: boolean;
}

function findPlayer(roomState: PublicMatchStateView, playerId: PlayerId): PublicPlayerStateView | null {
  return roomState.players.find((player) => player.id === playerId) ?? null;
}

export function WaitingLobbyScreen({
  roomState,
  localPlayerId,
  connectionLabel,
  onReadyToggle,
  busy,
  actionsDisabled = false,
}: WaitingLobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const localPlayer = findPlayer(roomState, localPlayerId);
  const opponentPlayer = findPlayer(roomState, localPlayerId === 'player1' ? 'player2' : 'player1');
  const everyoneConnected = roomState.players.length === 2 && roomState.players.every((player) => player.connected);
  const everyoneReady = roomState.players.length === 2 && roomState.players.every((player) => player.ready);
  const lobbyHeadline = !opponentPlayer
    ? 'Share the code to fill the second seat'
    : !opponentPlayer.connected
      ? `${opponentPlayer.displayName} is away from the room`
      : !everyoneReady
        ? 'Both players are here. Lock in the ready check.'
        : 'Both players are ready. Setup is about to begin.';
  const lobbyCopy = !opponentPlayer
    ? 'Use the room code below. A normal window plus a private window works well for first public testing.'
    : !opponentPlayer.connected
      ? 'The seat is preserved. The room will resume cleanly once the opponent reconnects.'
      : !everyoneReady
        ? 'Your room is live. Once both players toggle ready, the server will open the hidden starting-hand draft.'
        : 'The backend has both players marked ready and is moving into setup.';

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopyRoomCode() {
    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="glass-chip glass-chip--public">Waiting lobby</span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">Room {roomState.roomCode}</h2>
          <p className="body-copy mt-3 max-w-3xl">
            Both players connect from separate screens, confirm they are ready, and then the server starts the opening
            draft.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="glass-chip">Connection: {connectionLabel}</span>
          <span className={`glass-chip ${everyoneConnected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
            {everyoneConnected ? 'Both connected' : 'Waiting on connection'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <article className="liquid-panel liquid-panel--hero px-5 py-5">
          <p className="section-kicker">Room code</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="liquid-title text-5xl tracking-[0.18em] sm:text-6xl">{roomState.roomCode}</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
                {copied ? 'Copied. Send it to the second player.' : 'Tap copy, then share this code with the guest.'}
              </p>
            </div>
            <button type="button" onClick={handleCopyRoomCode} className="chrome-button min-w-[170px]">
              {copied ? 'Code copied' : 'Copy room code'}
            </button>
          </div>
        </article>

        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <p className="section-kicker">Lobby status</p>
          <h3 className="liquid-title mt-3 text-2xl">{lobbyHeadline}</h3>
          <p className="body-copy mt-3">{lobbyCopy}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="glass-chip">1. Share code</span>
            <span className="glass-chip">2. Opponent joins</span>
            <span className="glass-chip">3. Both ready</span>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {([localPlayer, opponentPlayer] as const).map((player, index) => (
          <article key={player?.id ?? `empty-${index}`} className="liquid-panel liquid-panel--neutral px-5 py-5">
            {player ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="glass-chip">{player.displayName}</span>
                    <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
                      {player.id === localPlayerId ? 'Local seat' : 'Opponent seat'}
                    </p>
                    <p className="liquid-title mt-2 text-4xl">{player.id === 'player1' ? 'Black pool' : 'Red pool'}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <span className={`glass-chip ${player.connected ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                      {player.connected ? 'Connected' : 'Offline'}
                    </span>
                    <span className={`glass-chip ${player.ready ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
                      {player.ready ? 'Ready' : 'Not ready'}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-[color:var(--ink-700)]">
                  {player.id === 'player1'
                    ? 'Attacks first and works from spades and clubs.'
                    : 'Defends first and works from hearts and diamonds.'}
                </p>
              </>
            ) : (
              <>
                <span className="glass-chip glass-chip--gold">Open seat</span>
                <h3 className="liquid-title mt-4 text-3xl">Waiting for opponent</h3>
                <p className="body-copy mt-3">Share the room code and keep this lobby open until the second player joins.</p>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip">Room code {roomState.roomCode}</span>
          <span className={`glass-chip ${everyoneReady ? 'glass-chip--success' : 'glass-chip--hidden'}`}>
            {everyoneReady ? 'Both ready' : 'Ready check active'}
          </span>
          {opponentPlayer && !opponentPlayer.connected ? (
            <span className="glass-chip glass-chip--gold">Opponent disconnected</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onReadyToggle(!localPlayer?.ready)}
          disabled={!localPlayer || busy || actionsDisabled}
          className="chrome-button min-w-[200px]"
        >
          {actionsDisabled ? 'Reconnect to ready up' : busy ? 'Sending...' : localPlayer?.ready ? 'Unready' : 'Ready up'}
        </button>
      </div>
    </section>
  );
}
