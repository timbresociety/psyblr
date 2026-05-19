import { useEffect, useMemo, useRef, useState } from 'react';
import {
  REPLENISHMENT_ROUNDS,
  TOTAL_ROUNDS,
  buildCardLookup,
  buildDeck,
  type Card,
  type PlayerId,
} from '@psyblr/game-engine';
import { BrandWordmark } from './components/BrandWordmark';
import { CreateRoomScreen } from './components/CreateRoomScreen';
import { FinalResultScreen } from './components/FinalResultScreen';
import { HelpModal } from './components/HelpModal';
import { HistoryPanel } from './components/HistoryPanel';
import { HomeScreen } from './components/HomeScreen';
import { JoinRoomScreen } from './components/JoinRoomScreen';
import { Layout } from './components/Layout';
import { OpeningRevealScreen } from './components/OpeningRevealScreen';
import { RoomActionScreen } from './components/RoomActionScreen';
import { RoundResultScreen } from './components/RoundResultScreen';
import { Scoreboard } from './components/Scoreboard';
import { WaitingLobbyScreen } from './components/WaitingLobbyScreen';
import {
  ApiError,
  createRoom,
  createRoomSocket,
  joinRoom,
  parseServerEvent,
  resumeRoom,
  sendSocketMessage,
} from './lib/network';
import type {
  PrivatePlayerStateView,
  PublicMatchStateView,
  RoomCreatedEvent,
  RoomJoinedEvent,
  RoomResumedEvent,
  RoomPhase,
  ServerEvent,
} from './lib/roomProtocol';

const NICKNAME_STORAGE_KEY = 'psyblr.nickname';
const QUICKSTART_STORAGE_KEY = 'psyblr.quickstartSeen';
const ROOM_SESSION_STORAGE_KEY = 'psyblr.roomSession';

const DECK = buildDeck();
const CARDS_BY_ID = buildCardLookup(DECK);

type LandingView = 'home' | 'create-room' | 'join-room';
type HelpMode = 'quickstart' | 'rules';
type ConnectionState =
  | 'idle'
  | 'creating'
  | 'joining'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface RoomSession {
  roomCode: string;
  playerId: PlayerId;
  sessionToken: string;
  websocketPath: string;
}

interface PresenceNotice {
  tone: 'success' | 'gold';
  message: string;
}

function sanitizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function getStoredValue(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(key) ?? '';
}

function getStoredFlag(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(key) === 'true';
}

function getStoredSession(): RoomSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(ROOM_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<RoomSession>;
    if (
      typeof parsedValue.roomCode !== 'string' ||
      (parsedValue.playerId !== 'player1' && parsedValue.playerId !== 'player2') ||
      typeof parsedValue.sessionToken !== 'string' ||
      typeof parsedValue.websocketPath !== 'string'
    ) {
      return null;
    }

    return {
      roomCode: parsedValue.roomCode,
      playerId: parsedValue.playerId,
      sessionToken: parsedValue.sessionToken,
      websocketPath: parsedValue.websocketPath,
    };
  } catch {
    return null;
  }
}

function persistSession(session: RoomSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ROOM_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getConnectionLabel(connectionState: ConnectionState): string {
  switch (connectionState) {
    case 'creating':
      return 'Creating room';
    case 'joining':
      return 'Joining room';
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Live';
    case 'reconnecting':
      return 'Reconnecting';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection issue';
    case 'idle':
    default:
      return 'Idle';
  }
}

function getPlayerLabel(playerId: PlayerId): string {
  return playerId === 'player1' ? 'Player 1' : 'Player 2';
}

function getLocalPlayer(roomState: PublicMatchStateView | null, localPlayerId: PlayerId | null) {
  if (!roomState || !localPlayerId) {
    return null;
  }

  return roomState.players.find((player) => player.id === localPlayerId) ?? null;
}

function getLatestRound(roomState: PublicMatchStateView | null) {
  if (!roomState || roomState.discardHistory.length === 0) {
    return null;
  }

  return roomState.discardHistory[roomState.discardHistory.length - 1];
}

function mapCardIdsToCards(cardIds: string[]): Card[] {
  return cardIds
    .map((cardId) => CARDS_BY_ID[cardId])
    .filter((card): card is Card => Boolean(card));
}

function PublicStatusScreen({
  title,
  eyebrow,
  description,
  badges,
  actionLabel,
  actionDisabled,
  onAction,
}: {
  title: string;
  eyebrow: string;
  description: string;
  badges?: string[];
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="glass-chip glass-chip--public">{eyebrow}</span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">{title}</h2>
          <p className="body-copy mt-3 max-w-3xl">{description}</p>
        </div>

        {onAction && actionLabel ? (
          <button type="button" onClick={onAction} disabled={actionDisabled} className="chrome-button min-w-[220px]">
            {actionLabel}
          </button>
        ) : null}
      </div>

      {badges && badges.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge} className="glass-chip">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function App() {
  const [landingView, setLandingView] = useState<LandingView>('home');
  const [nickname, setNickname] = useState(() => getStoredValue(NICKNAME_STORAGE_KEY));
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<RoomSession | null>(null);
  const [publicState, setPublicState] = useState<PublicMatchStateView | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerStateView | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<HelpMode>('rules');
  const [hasSeenQuickstart, setHasSeenQuickstart] = useState(() => getStoredFlag(QUICKSTART_STORAGE_KEY));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreState, setRestoreState] = useState<'idle' | 'restoring'>('idle');
  const [presenceNotice, setPresenceNotice] = useState<PresenceNotice | null>(null);
  const [busyAction, setBusyAction] = useState<
    'ready' | 'setup' | 'round' | 'replenishment' | 'phase' | null
  >(null);
  const [phaseReadyPending, setPhaseReadyPending] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const previousPhaseRef = useRef<RoomPhase | null>(null);

  const localPlayerId = session?.playerId ?? null;
  const localPlayer = getLocalPlayer(publicState, localPlayerId);
  const latestRound = getLatestRound(publicState);
  const connectionLabel = getConnectionLabel(connectionState);
  const interactionsDisabled = connectionState !== 'connected';
  const connectionBannerMessage =
    connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'Your client is reconnecting to the room. The Durable Object is holding the authoritative match state while the socket comes back.'
      : connectionState === 'disconnected'
        ? 'The live room connection dropped. Psyblr is trying to reclaim your seat automatically.'
        : connectionState === 'error'
          ? 'A connection error was detected. Psyblr is retrying so you can get back into the same room.'
          : presenceNotice?.message;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  }, [nickname]);

  useEffect(() => {
    if (!session || !publicState || hasSeenQuickstart) {
      return;
    }

    setHelpMode('quickstart');
    setHelpOpen(true);
    setHasSeenQuickstart(true);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUICKSTART_STORAGE_KEY, 'true');
    }
  }, [hasSeenQuickstart, publicState, session]);

  useEffect(() => {
    if (session || restoreState === 'restoring') {
      return;
    }

    const storedSession = getStoredSession();
    if (!storedSession) {
      return;
    }

    const sessionToRestore = storedSession;
    let cancelled = false;

    async function restoreSession() {
      try {
        setRestoreState('restoring');
        setConnectionState('reconnecting');
        const response = await resumeRoom(
          sessionToRestore.roomCode,
          sessionToRestore.playerId,
          sessionToRestore.sessionToken,
        );

        if (cancelled) {
          return;
        }

        initializeSessionFromResponse(response);
      } catch (error) {
        if (cancelled) {
          return;
        }

        persistSession(null);
        setRestoreState('idle');
        setConnectionState('idle');
        setErrorMessage(
          error instanceof Error
            ? `${error.message} Start a new room if this session has expired.`
            : 'Could not restore the previous room session.',
        );
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [restoreState, session]);

  useEffect(() => {
    const currentPhase = publicState?.phase ?? null;
    if (currentPhase && previousPhaseRef.current !== currentPhase) {
      previousPhaseRef.current = currentPhase;
      setPhaseReadyPending(false);
      setBusyAction(null);
    }

    if (!currentPhase) {
      previousPhaseRef.current = null;
    }
  }, [publicState?.phase]);

  useEffect(() => {
    if (!presenceNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setPresenceNotice(null), 4800);
    return () => window.clearTimeout(timeoutId);
  }, [presenceNotice]);

  useEffect(() => {
    if (!session) {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    shouldReconnectRef.current = true;
    let active = true;

    const connect = async (isReconnect: boolean) => {
      if (!active) {
        return;
      }

      setConnectionState(isReconnect ? 'reconnecting' : 'connecting');

      if (isReconnect) {
        try {
          const resumedSession = await resumeRoom(session.roomCode, session.playerId, session.sessionToken);

          if (!active) {
            return;
          }

          persistSession({
            roomCode: resumedSession.roomCode,
            playerId: resumedSession.playerId,
            sessionToken: resumedSession.sessionToken,
            websocketPath: resumedSession.websocketPath,
          });
        } catch (error) {
          if (!active) {
            return;
          }

          if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
            persistSession(null);
            setSession(null);
            setPublicState(null);
            setPrivateState(null);
            setConnectionState('idle');
            setErrorMessage(`${error.message} The saved room session is no longer available.`);
            return;
          }

          setConnectionState('disconnected');
          const delay = Math.min(1200 * (reconnectAttemptRef.current + 1), 4000);
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            void connect(true);
          }, delay);
          return;
        }
      }

      const socket = createRoomSocket(session.websocketPath, session.playerId, session.sessionToken);
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (!active) {
          return;
        }

        reconnectAttemptRef.current = 0;
        setConnectionState('connected');
        setErrorMessage(null);
        if (isReconnect) {
          setPresenceNotice({
            tone: 'success',
            message: 'Connection restored. Your room seat and hidden state are synced again.',
          });
        }
      });

      socket.addEventListener('message', (event) => {
        if (!active) {
          return;
        }

        const parsedEvent = parseServerEvent(String(event.data));
        handleServerEvent(parsedEvent);
      });

      socket.addEventListener('error', () => {
        if (!active) {
          return;
        }

        setConnectionState('error');
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (!active || !shouldReconnectRef.current) {
          return;
        }

        setConnectionState('disconnected');
        const delay = Math.min(1200 * (reconnectAttemptRef.current + 1), 4000);
        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          void connect(true);
        }, delay);
      });
    };

    void connect(false);

    return () => {
      active = false;
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session]);

  function handleServerEvent(event: ServerEvent) {
    switch (event.type) {
      case 'lobby_state':
        setPublicState((previousState) => {
          if (localPlayerId) {
            const opponentId = localPlayerId === 'player1' ? 'player2' : 'player1';
            const previousOpponent = previousState?.players.find((player) => player.id === opponentId);
            const nextOpponent = event.state.players.find((player) => player.id === opponentId);

            if (previousOpponent && nextOpponent && previousOpponent.connected !== nextOpponent.connected) {
              setPresenceNotice({
                tone: nextOpponent.connected ? 'success' : 'gold',
                message: nextOpponent.connected
                  ? `${nextOpponent.displayName} reconnected.`
                  : `${nextOpponent.displayName} disconnected. The room state is being held for their return.`,
              });
            }
          }

          return event.state;
        });
        if (event.state.phase !== 'opening-reveal' && event.state.phase !== 'round-reveal' && event.state.phase !== 'replenishment-reveal') {
          setPhaseReadyPending(false);
        }
        return;
      case 'private_state':
        if (event.playerId === localPlayerId) {
          setPrivateState(event.state);
          if (event.state.currentLockedChoice) {
            setBusyAction(null);
          }
        }
        return;
      case 'error':
        setErrorMessage(event.message);
        setBusyAction(null);
        setPhaseReadyPending(false);
        return;
      case 'room_created':
      case 'room_joined':
      case 'room_resumed':
      case 'setup_started':
      case 'opening_spend_revealed':
      case 'round_started':
      case 'round_resolved':
      case 'replenishment_started':
      case 'replenishment_resolved':
      case 'match_finished':
        return;
    }
  }

  function resetToHome() {
    resetFlow('home');
  }

  function resetFlow(nextView: LandingView) {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setSession(null);
    setPublicState(null);
    setPrivateState(null);
    setRestoreState('idle');
    setPresenceNotice(null);
    setLandingView(nextView);
    setConnectionState('idle');
    setErrorMessage(null);
    setBusyAction(null);
    setPhaseReadyPending(false);
    if (nextView !== 'join-room') {
      setJoinCode('');
    }
    persistSession(null);
  }

  function handleNicknameChange(value: string) {
    setNickname(value);
    setErrorMessage(null);
  }

  function handleRoomCodeChange(value: string) {
    setJoinCode(sanitizeRoomCode(value));
    setErrorMessage(null);
  }

  function openLandingView(view: LandingView) {
    setLandingView(view);
    setErrorMessage(null);
  }

  async function handleCreateRoom() {
    try {
      setConnectionState('creating');
      setErrorMessage(null);
      const response = await createRoom(nickname.trim());
      initializeSessionFromResponse(response);
    } catch (error) {
      setConnectionState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not create the room.');
    }
  }

  async function handleJoinRoom() {
    try {
      setConnectionState('joining');
      setErrorMessage(null);
      const response = await joinRoom(sanitizeRoomCode(joinCode.trim()), nickname.trim());
      initializeSessionFromResponse(response);
    } catch (error) {
      setConnectionState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not join that room.');
    }
  }

  function initializeSessionFromResponse(response: RoomCreatedEvent | RoomJoinedEvent | RoomResumedEvent) {
    const nextSession = {
      roomCode: response.roomCode,
      playerId: response.playerId,
      sessionToken: response.sessionToken,
      websocketPath: response.websocketPath,
    } satisfies RoomSession;

    setSession(nextSession);
    setPublicState(null);
    setPrivateState(null);
    setRestoreState('idle');
    setBusyAction(null);
    setPhaseReadyPending(false);
    setLandingView('home');
    persistSession(nextSession);
    if (response.type === 'room_resumed') {
      setPresenceNotice({
        tone: 'success',
        message: 'Seat reclaimed. Rejoining the live room now.',
      });
    }
  }

  function sendReadyToggle(ready: boolean) {
    try {
      setBusyAction('ready');
      setErrorMessage(null);
      sendSocketMessage(socketRef.current, {
        type: 'player_ready',
        ready,
      });
    } catch (error) {
      setBusyAction(null);
      setErrorMessage(error instanceof Error ? error.message : 'Could not send ready state.');
    }
  }

  function submitStartingHand(cardIds: string[]) {
    try {
      setBusyAction('setup');
      setErrorMessage(null);
      sendSocketMessage(socketRef.current, {
        type: 'submit_starting_hand',
        cardIds,
      });
      return null;
    } catch (error) {
      setBusyAction(null);
      return error instanceof Error ? error.message : 'Could not submit the starting hand.';
    }
  }

  function submitRoundCard(cardIds: string[]) {
    try {
      setBusyAction('round');
      setErrorMessage(null);
      sendSocketMessage(socketRef.current, {
        type: 'lock_round_card',
        cardId: cardIds[0],
      });
      return null;
    } catch (error) {
      setBusyAction(null);
      return error instanceof Error ? error.message : 'Could not lock the round card.';
    }
  }

  function submitReplenishment(cardIds: string[]) {
    try {
      setBusyAction('replenishment');
      setErrorMessage(null);
      sendSocketMessage(socketRef.current, {
        type: 'buy_replenishment_card',
        cardId: cardIds[0],
      });
      return null;
    } catch (error) {
      setBusyAction(null);
      return error instanceof Error ? error.message : 'Could not lock the replenishment card.';
    }
  }

  function advancePhase() {
    try {
      setBusyAction('phase');
      setPhaseReadyPending(true);
      setErrorMessage(null);
      sendSocketMessage(socketRef.current, {
        type: 'next_phase_ready',
      });
    } catch (error) {
      setBusyAction(null);
      setPhaseReadyPending(false);
      setErrorMessage(error instanceof Error ? error.message : 'Could not confirm the next phase.');
    }
  }

  const gameplayCards = useMemo(() => {
    if (!privateState || !publicState) {
      return [] as Card[];
    }

    switch (publicState.phase) {
      case 'setup':
      case 'replenishment':
        return mapCardIdsToCards(privateState.remainingPoolCardIds);
      case 'round':
        return mapCardIdsToCards(privateState.handCardIds);
      default:
        return [] as Card[];
    }
  }, [privateState, publicState]);

  function renderLandingScreen() {
    if (landingView === 'create-room') {
      return (
        <CreateRoomScreen
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onSubmit={handleCreateRoom}
          onBack={() => openLandingView('home')}
          loading={connectionState === 'creating'}
        />
      );
    }

    if (landingView === 'join-room') {
      return (
        <JoinRoomScreen
          nickname={nickname}
          roomCode={joinCode}
          onNicknameChange={handleNicknameChange}
          onRoomCodeChange={handleRoomCodeChange}
          onSubmit={handleJoinRoom}
          onBack={() => openLandingView('home')}
          loading={connectionState === 'joining'}
        />
      );
    }

    return (
      <HomeScreen
        nickname={nickname}
        onNicknameChange={handleNicknameChange}
        onCreateRoom={() => openLandingView('create-room')}
        onJoinRoom={() => openLandingView('join-room')}
        onOpenRules={() => {
          setHelpMode('rules');
          setHelpOpen(true);
        }}
      />
    );
  }

  function renderInRoomContent() {
    if (!session || !publicState || !localPlayerId) {
      return (
        <PublicStatusScreen
          eyebrow="Connecting"
          title="Joining your live room surface"
          description="The room shell is ready. As soon as the server sends the first lobby snapshot, Psyblr will switch into the shared match view."
          badges={[`Connection ${connectionLabel}`, session ? `Room ${session.roomCode}` : 'Authoritative server']}
          actionLabel="Return home"
          onAction={resetToHome}
        />
      );
    }

    if (
      (publicState.phase === 'setup' || publicState.phase === 'round' || publicState.phase === 'replenishment') &&
      !privateState
    ) {
      return (
        <PublicStatusScreen
          eyebrow="Syncing private state"
          title="Loading your hidden hand"
          description="The public room is live. Your private hand, pool, and remaining budget are still syncing from the server."
          badges={[`Room ${publicState.roomCode}`, `Connection ${connectionLabel}`]}
        />
      );
    }

    const localDisplayName = localPlayer?.displayName ?? getPlayerLabel(localPlayerId);

    switch (publicState.phase) {
      case 'lobby':
        return (
          <WaitingLobbyScreen
            roomState={publicState}
            localPlayerId={localPlayerId}
            connectionLabel={connectionLabel}
            onReadyToggle={sendReadyToggle}
            busy={busyAction === 'ready'}
            actionsDisabled={interactionsDisabled}
          />
        );
      case 'setup':
        return privateState ? (
          <RoomActionScreen
            mode="setup"
            roomState={publicState}
            privateState={privateState}
            localPlayerId={localPlayerId}
            cards={gameplayCards}
            localDisplayName={localDisplayName}
            onConfirm={submitStartingHand}
            busy={busyAction === 'setup'}
            actionsDisabled={interactionsDisabled}
          />
        ) : null;
      case 'opening-reveal':
        return (
          <OpeningRevealScreen
            roomState={publicState}
            localPlayerId={localPlayerId}
            onContinue={advancePhase}
            busy={phaseReadyPending}
            actionsDisabled={interactionsDisabled}
          />
        );
      case 'round':
        return privateState ? (
          <RoomActionScreen
            mode="round"
            roomState={publicState}
            privateState={privateState}
            localPlayerId={localPlayerId}
            cards={gameplayCards}
            localDisplayName={localDisplayName}
            onConfirm={submitRoundCard}
            busy={busyAction === 'round'}
            actionsDisabled={interactionsDisabled}
          />
        ) : null;
      case 'round-reveal':
        return latestRound ? (
          <RoundResultScreen
            round={latestRound}
            cardsById={CARDS_BY_ID}
            localPlayerId={localPlayerId}
            onContinue={advancePhase}
            busy={phaseReadyPending}
            actionsDisabled={interactionsDisabled}
          />
        ) : (
          <PublicStatusScreen
            eyebrow="Round reveal"
            title="Round result is on the way"
            description="The server has resolved the exchange. The public reveal card pair is about to sync."
            badges={[`Round ${publicState.roundNumber}`]}
          />
        );
      case 'replenishment':
        return privateState ? (
          <RoomActionScreen
            mode="replenishment"
            roomState={publicState}
            privateState={privateState}
            localPlayerId={localPlayerId}
            cards={gameplayCards}
            localDisplayName={localDisplayName}
            onConfirm={submitReplenishment}
            busy={busyAction === 'replenishment'}
            actionsDisabled={interactionsDisabled}
          />
        ) : null;
      case 'replenishment-reveal':
        return (
          <PublicStatusScreen
            eyebrow="Replenishment sealed"
            title="Both hidden buys are locked"
            description={
              publicState.roundNumber < TOTAL_ROUNDS
                ? `Both players added one private card after round ${publicState.roundNumber}. Confirm when you're ready to move into round ${publicState.roundNumber + 1}.`
                : 'All buys are complete and the room is preparing the final stretch.'
            }
            badges={[
              `After round ${publicState.roundNumber}`,
              publicState.roundNumber <= REPLENISHMENT_ROUNDS ? '1 secret buy each' : 'No more buys',
            ]}
            actionLabel={
              interactionsDisabled
                ? 'Reconnecting...'
                : phaseReadyPending
                  ? 'Waiting for opponent...'
                  : `Ready for round ${publicState.roundNumber + 1}`
            }
            actionDisabled={phaseReadyPending || interactionsDisabled}
            onAction={advancePhase}
          />
        );
      case 'finished':
        return (
          <FinalResultScreen
            roomState={publicState}
            localPlayerId={localPlayerId}
            cardsById={CARDS_BY_ID}
            onReturnHome={resetToHome}
            onStartRematch={() => resetFlow('create-room')}
          />
        );
    }
  }

  return (
    <Layout>
      <header className="liquid-panel liquid-panel--hero screen-entrance px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="glass-chip glass-chip--public">Live online room game</span>
              <span className="glass-chip glass-chip--gold">Server authoritative</span>
              {session ? <span className="glass-chip">Room {session.roomCode}</span> : null}
            </div>
            <div className="mt-5">
              <BrandWordmark size={session ? 'compact' : 'hero'} />
            </div>
            <p className="body-copy mt-4 max-w-3xl">
              A premium two-player strategy duel with hidden hands, budget pressure, and live round resolution. Your
              client only shows your private hand while the server owns the match.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setHelpMode(session ? 'quickstart' : 'rules');
                setHelpOpen(true);
              }}
              className="chrome-button chrome-button--ghost"
            >
              {session ? 'Game help' : 'Rules and flow'}
            </button>
            {session ? (
              <button type="button" onClick={resetToHome} className="chrome-button chrome-button--ghost">
                Leave room
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-[1.5rem] border border-white/50 bg-[rgba(255,143,129,0.18)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-950)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            {errorMessage}
          </div>
        ) : null}
      </header>

      {!session ? (
        restoreState === 'restoring' ? (
          <PublicStatusScreen
            eyebrow="Restoring room"
            title="Reclaiming your saved Psyblr seat"
            description="The app found a saved room session and is verifying it with the server before reconnecting your browser."
            badges={['Authoritative resume', 'No hidden state leaked']}
            actionLabel="Cancel"
            onAction={resetToHome}
          />
        ) : (
          renderLandingScreen()
        )
      ) : (
        <>
          {presenceNotice || connectionState !== 'connected' ? (
            <section
              className={`liquid-panel ${presenceNotice?.tone === 'success' ? 'liquid-panel--success' : 'liquid-panel--neutral'} screen-entrance px-5 py-4`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className={`glass-chip ${connectionState === 'connected' ? 'glass-chip--success' : 'glass-chip--gold'}`}>
                    {connectionState === 'connected' ? 'Presence update' : 'Reconnect status'}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">
                    {connectionBannerMessage}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="glass-chip">Connection {connectionLabel}</span>
                  {publicState ? <span className="glass-chip">Room {publicState.roomCode}</span> : null}
                </div>
              </div>
            </section>
          ) : null}

          <Scoreboard
            roomState={publicState}
            privateState={privateState}
            localPlayerId={localPlayerId}
            connectionLabel={connectionLabel}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(320px,0.88fr)]">
            <div className="flex flex-col gap-6">{renderInRoomContent()}</div>
            <div className="flex flex-col gap-6">
              <HistoryPanel history={publicState?.discardHistory ?? []} cardsById={CARDS_BY_ID} />
            </div>
          </div>
        </>
      )}

      <HelpModal
        open={helpOpen}
        mode={helpMode}
        hasStarted={Boolean(session)}
        onClose={() => setHelpOpen(false)}
        onSwitchMode={(mode) => setHelpMode(mode)}
      />
    </Layout>
  );
}
