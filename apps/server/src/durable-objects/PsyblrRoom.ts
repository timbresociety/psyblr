import { DurableObject } from 'cloudflare:workers';
import {
  PLAYER_IDS,
  type PlayerId,
} from '@psyblr/game-engine';
import {
  INTERNAL_RESUME_ROOM_PATH,
  INTERNAL_CREATE_ROOM_PATH,
  INTERNAL_JOIN_ROOM_PATH,
  INTERNAL_SOCKET_PATH,
  ROOM_STATE_STORAGE_KEY,
} from '../config';
import type {
  BuyReplenishmentCardMessage,
  ClientMessage,
  ErrorEvent,
  JoinRoomMessage,
  LockRoundCardMessage,
  NextPhaseReadyMessage,
  PlayerReadyMessage,
  RoomCreatedEvent,
  RoomJoinedEvent,
  RoomResumedEvent,
  ResumeRoomMessage,
  ServerEvent,
  SubmitStartingHandMessage,
} from '../messages';
import { errorResponse, jsonResponse, readJson } from '../lib/http';
import { generateSessionToken } from '../lib/room-code';
import {
  clearRoomAbandonmentDeadline,
  createLobbyStateEvent,
  createPrivateStateEvent,
  createRoomPlayerState,
  createRoomState,
  ensureRoomAbandonmentDeadline,
  getJoinedPlayerIds,
  hasConnectedPlayers,
  isRoomExpired,
  markRoomActivity,
  normalizePlayerName,
  updatePlayerConnectionState,
} from '../lib/room-state';
import type { RoomState } from '../types';
import {
  applyNextPhaseReadyIntent,
  applyPlayerReadyIntent,
  applyReplenishmentIntent,
  applyRoundCardIntent,
  applyStartingHandIntent,
  type RoomTransitionResult,
} from '../lib/room-gameplay';

type SocketRegistry = Map<PlayerId, Set<WebSocket>>;

export interface Env {
  PSYBLR_ROOM: DurableObjectNamespace;
}

export class PsyblrRoom extends DurableObject {
  private readonly durableState: DurableObjectState;
  private roomState: RoomState | null = null;
  private readonly socketsByPlayer: SocketRegistry = new Map();
  private readonly playerBySocket = new Map<WebSocket, PlayerId>();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.durableState = state;

    this.durableState.blockConcurrencyWhile(async () => {
      const storedState = await this.durableState.storage.get<RoomState>(ROOM_STATE_STORAGE_KEY);

      if (!storedState) {
        return;
      }

      this.roomState = storedState;
      const now = new Date();

      for (const playerId of PLAYER_IDS) {
        const player = this.roomState.players[playerId];
        if (player) {
          player.connected = false;
          player.disconnectedAt ??= now.toISOString();
        }
      }

      ensureRoomAbandonmentDeadline(this.roomState, now);
      await this.syncRoomAlarm();
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.expireRoomIfNeeded();
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === INTERNAL_CREATE_ROOM_PATH) {
      return this.handleCreateRoom(request);
    }

    if (request.method === 'POST' && url.pathname === INTERNAL_JOIN_ROOM_PATH) {
      return this.handleJoinRoom(request);
    }

    if (request.method === 'POST' && url.pathname === INTERNAL_RESUME_ROOM_PATH) {
      return this.handleResumeRoom(request);
    }

    if (request.method === 'GET' && url.pathname === INTERNAL_SOCKET_PATH) {
      return this.handleSocketUpgrade(request);
    }

    return errorResponse(404, 'room_route_not_found', 'Route not found inside PsyblrRoom.');
  }

  private async handleCreateRoom(request: Request): Promise<Response> {
    const payload = await readJson<{ type: 'create_room'; displayName?: string; roomCode: string }>(request);

    if (payload.type !== 'create_room' || typeof payload.roomCode !== 'string') {
      return errorResponse(400, 'invalid_create_room', 'Expected a create_room payload.');
    }

    if (this.roomState) {
      return errorResponse(409, 'room_already_exists', 'This room code is already in use.');
    }

    const roomCode = payload.roomCode;
    const sessionToken = generateSessionToken();
    this.roomState = createRoomState(roomCode, normalizePlayerName('player1', payload.displayName), sessionToken);
    await this.persistRoomState();

    const event: RoomCreatedEvent = {
      type: 'room_created',
      roomCode,
      playerId: 'player1',
      sessionToken,
      websocketPath: `/api/rooms/${roomCode}/socket`,
      phase: this.roomState.phase,
    };

    return jsonResponse(event, 201);
  }

  private async handleJoinRoom(request: Request): Promise<Response> {
    const payload = await readJson<JoinRoomMessage>(request);

    if (payload.type !== 'join_room') {
      return errorResponse(400, 'invalid_join_room', 'Expected a join_room payload.');
    }

    if (!this.roomState) {
      return errorResponse(404, 'room_not_found', 'That room code does not exist.');
    }

    const roomState = this.roomState;

    if (payload.roomCode !== roomState.roomCode) {
      return errorResponse(404, 'room_not_found', 'That room code does not match this room instance.');
    }

    if (roomState.players.player2) {
      return errorResponse(409, 'room_full', 'This room already has two players.');
    }

    const sessionToken = generateSessionToken();
    roomState.players.player2 = createRoomPlayerState(
      'player2',
      normalizePlayerName('player2', payload.displayName),
      sessionToken,
    );
    this.refreshAbandonmentWindow(new Date());
    await this.persistRoomState();
    this.broadcastLobbyState();

    const event: RoomJoinedEvent = {
      type: 'room_joined',
      roomCode: roomState.roomCode,
      playerId: 'player2',
      sessionToken,
      websocketPath: `/api/rooms/${roomState.roomCode}/socket`,
      phase: roomState.phase,
    };

    return jsonResponse(event, 200);
  }

  private async handleResumeRoom(request: Request): Promise<Response> {
    const payload = await readJson<ResumeRoomMessage>(request);

    if (payload.type !== 'resume_room') {
      return errorResponse(400, 'invalid_resume_room', 'Expected a resume_room payload.');
    }

    if (!this.roomState) {
      return errorResponse(404, 'room_not_found', 'That room no longer exists.');
    }

    const roomState = this.roomState;
    if (payload.roomCode !== roomState.roomCode) {
      return errorResponse(404, 'room_not_found', 'That room code does not match this room instance.');
    }

    const player = roomState.players[payload.playerId];
    if (!player) {
      return errorResponse(404, 'player_not_found', 'That player seat is no longer available in this room.');
    }

    if (payload.sessionToken !== player.sessionToken) {
      return errorResponse(401, 'invalid_session_token', 'That saved seat token is no longer valid.');
    }

    this.refreshAbandonmentWindow(new Date());
    await this.persistRoomState();

    const event: RoomResumedEvent = {
      type: 'room_resumed',
      roomCode: roomState.roomCode,
      playerId: payload.playerId,
      sessionToken: player.sessionToken,
      websocketPath: `/api/rooms/${roomState.roomCode}/socket`,
      phase: roomState.phase,
    };

    return jsonResponse(event, 200);
  }

  private async handleSocketUpgrade(request: Request): Promise<Response> {
    if (!this.roomState) {
      return errorResponse(404, 'room_not_found', 'That room code does not exist.');
    }

    const roomState = this.roomState;
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId') as PlayerId | null;
    const sessionToken = url.searchParams.get('sessionToken');

    if (!playerId || !PLAYER_IDS.includes(playerId)) {
      return errorResponse(400, 'missing_player_id', 'Provide a valid playerId query parameter.');
    }

    const player = roomState.players[playerId];
    if (!player) {
      return errorResponse(404, 'player_not_found', 'That player seat has not joined this room.');
    }

    if (!sessionToken || sessionToken !== player.sessionToken) {
      return errorResponse(401, 'invalid_session_token', 'Provide a valid room session token.');
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return errorResponse(426, 'websocket_upgrade_required', 'Use a WebSocket upgrade request for this route.');
    }

    const pair = new WebSocketPair();
    const clientSocket = pair[0];
    const serverSocket = pair[1];

    serverSocket.accept();
    this.registerSocket(playerId, serverSocket);
    updatePlayerConnectionState(roomState, playerId, true, new Date());
    await this.persistRoomState();

    serverSocket.addEventListener('message', (event) => {
      void this.handleSocketMessage(serverSocket, playerId, event.data);
    });
    serverSocket.addEventListener('close', () => {
      void this.handleSocketClose(serverSocket);
    });
    serverSocket.addEventListener('error', () => {
      void this.handleSocketClose(serverSocket);
    });

    this.sendPrivateState(playerId);
    this.broadcastLobbyState();

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }

  private async handleSocketMessage(socket: WebSocket, playerId: PlayerId, rawData: string | ArrayBuffer): Promise<void> {
    try {
      const jsonText = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);
      const message = JSON.parse(jsonText) as ClientMessage;

      if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        this.sendError(socket, 'invalid_message', 'Expected a valid Psyblr client message.');
        return;
      }

      switch (message.type) {
        case 'player_ready':
          await this.handlePlayerReady(playerId, message);
          return;
        case 'submit_starting_hand':
          await this.handleStartingHand(playerId, message);
          return;
        case 'lock_round_card':
          await this.handleRoundCardLock(playerId, message);
          return;
        case 'buy_replenishment_card':
          await this.handleReplenishmentBuy(playerId, message);
          return;
        case 'next_phase_ready':
          await this.handleNextPhaseReady(playerId, message);
          return;
        case 'create_room':
        case 'join_room':
        case 'resume_room':
          this.sendError(socket, 'http_only_message', `${message.type} is only supported via HTTP routes.`);
      }
    } catch {
      this.sendError(socket, 'invalid_json', 'Could not parse the socket message payload.');
    }
  }

  private async handlePlayerReady(playerId: PlayerId, message: PlayerReadyMessage): Promise<void> {
    await this.applyTransition(playerId, applyPlayerReadyIntent(this.requireRoomState(), playerId, message.ready));
  }

  private async handleStartingHand(playerId: PlayerId, message: SubmitStartingHandMessage): Promise<void> {
    await this.applyTransition(playerId, applyStartingHandIntent(this.requireRoomState(), playerId, message.cardIds));
  }

  private async handleRoundCardLock(playerId: PlayerId, message: LockRoundCardMessage): Promise<void> {
    await this.applyTransition(playerId, applyRoundCardIntent(this.requireRoomState(), playerId, message.cardId));
  }

  private async handleReplenishmentBuy(playerId: PlayerId, message: BuyReplenishmentCardMessage): Promise<void> {
    await this.applyTransition(playerId, applyReplenishmentIntent(this.requireRoomState(), playerId, message.cardId));
  }

  private async handleNextPhaseReady(playerId: PlayerId, _message: NextPhaseReadyMessage): Promise<void> {
    await this.applyTransition(playerId, applyNextPhaseReadyIntent(this.requireRoomState(), playerId));
  }

  private registerSocket(playerId: PlayerId, socket: WebSocket): void {
    const existingSockets = this.socketsByPlayer.get(playerId) ?? new Set<WebSocket>();
    existingSockets.add(socket);
    this.socketsByPlayer.set(playerId, existingSockets);
    this.playerBySocket.set(socket, playerId);
  }

  private async handleSocketClose(socket: WebSocket): Promise<void> {
    const playerId = this.playerBySocket.get(socket);
    if (!playerId) {
      return;
    }

    this.playerBySocket.delete(socket);
    const playerSockets = this.socketsByPlayer.get(playerId);
    if (playerSockets) {
      playerSockets.delete(socket);
      if (playerSockets.size === 0) {
        this.socketsByPlayer.delete(playerId);
      }
    }

    const roomState = this.roomState;
    if (!roomState) {
      return;
    }

    const player = roomState.players[playerId];
    if (!player) {
      return;
    }

    updatePlayerConnectionState(roomState, playerId, (this.socketsByPlayer.get(playerId)?.size ?? 0) > 0, new Date());
    await this.persistRoomState();
    this.broadcastLobbyState();
  }

  async alarm(): Promise<void> {
    await this.expireRoomIfNeeded();
  }

  private broadcastLobbyState(): void {
    if (!this.roomState) {
      return;
    }

    this.broadcastEvent(createLobbyStateEvent(this.roomState));
  }

  private broadcastPrivateStates(): void {
    if (!this.roomState) {
      return;
    }

    for (const playerId of getJoinedPlayerIds(this.roomState)) {
      this.sendPrivateState(playerId);
    }
  }

  private sendPrivateState(playerId: PlayerId): void {
    if (!this.roomState || !this.roomState.players[playerId]) {
      return;
    }

    this.sendEventToPlayer(playerId, createPrivateStateEvent(this.roomState, playerId));
  }

  private sendEventToPlayer(playerId: PlayerId, event: ServerEvent): void {
    const sockets = this.socketsByPlayer.get(playerId);
    if (!sockets) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      socket.send(payload);
    }
  }

  private broadcastEvent(event: ServerEvent): void {
    const payload = JSON.stringify(event);

    for (const sockets of this.socketsByPlayer.values()) {
      for (const socket of sockets) {
        socket.send(payload);
      }
    }
  }

  private sendError(socket: WebSocket, code: string, message: string): void {
    const event: ErrorEvent = {
      type: 'error',
      code,
      message,
    };

    socket.send(JSON.stringify(event));
  }

  private requireRoomState(): RoomState {
    if (!this.roomState) {
      throw new Error('Room state has not been initialized.');
    }

    return this.roomState;
  }

  private async applyTransition(playerId: PlayerId, result: RoomTransitionResult): Promise<void> {
    if (!result.ok) {
      this.sendEventToPlayer(playerId, result.error);
      return;
    }

    await this.persistRoomState();

    for (const event of result.events) {
      this.broadcastEvent(event);
    }

    this.broadcastLobbyState();
    this.broadcastPrivateStates();
  }

  private async persistRoomState(): Promise<void> {
    if (!this.roomState) {
      return;
    }

    await this.durableState.storage.put(ROOM_STATE_STORAGE_KEY, this.roomState);
    await this.syncRoomAlarm();
  }

  private async syncRoomAlarm(): Promise<void> {
    if (!this.roomState) {
      await this.durableState.storage.deleteAlarm();
      return;
    }

    if (this.roomState.abandonmentExpiresAt) {
      await this.durableState.storage.setAlarm(Date.parse(this.roomState.abandonmentExpiresAt));
      return;
    }

    await this.durableState.storage.deleteAlarm();
  }

  private hasLiveSockets(): boolean {
    return Array.from(this.socketsByPlayer.values()).some((sockets) => sockets.size > 0);
  }

  private async expireRoomIfNeeded(): Promise<void> {
    if (!this.roomState) {
      return;
    }

    if (this.hasLiveSockets() || hasConnectedPlayers(this.roomState)) {
      clearRoomAbandonmentDeadline(this.roomState);
      await this.persistRoomState();
      return;
    }

    if (!isRoomExpired(this.roomState)) {
      return;
    }

    await this.durableState.storage.delete(ROOM_STATE_STORAGE_KEY);
    await this.durableState.storage.deleteAlarm();
    this.roomState = null;
  }

  private refreshAbandonmentWindow(now: Date): void {
    if (!this.roomState) {
      return;
    }

    markRoomActivity(this.roomState, now);
    if (hasConnectedPlayers(this.roomState)) {
      clearRoomAbandonmentDeadline(this.roomState);
      return;
    }

    clearRoomAbandonmentDeadline(this.roomState);
    ensureRoomAbandonmentDeadline(this.roomState, now);
  }
}
