import type { PlayerId } from '@psyblr/game-engine';
import type {
  ClientMessage,
  CreateRoomMessage,
  ErrorEvent,
  JoinRoomMessage,
  RoomCreatedEvent,
  RoomJoinedEvent,
  RoomResumedEvent,
  ResumeRoomMessage,
  ServerEvent,
} from './roomProtocol';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_PUBLIC_APP_URL = 'https://psyblr.vercel.app';
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:8787';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function readOptionalEnvUrl(value: string | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimTrailingSlash(trimmedValue) : null;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getApiBaseUrl(): string {
  const configured = readOptionalEnvUrl(import.meta.env.VITE_API_BASE_URL);

  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_PUBLIC_APP_URL;
  }

  const { hostname, origin } = window.location;
  if (isLocalHostname(hostname)) {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  return trimTrailingSlash(origin);
}

function getWebSocketBaseUrl(): string {
  return getApiBaseUrl().replace(/^http/, 'ws');
}

async function postJson<TResponse>(
  path: string,
  payload: CreateRoomMessage | JoinRoomMessage | ResumeRoomMessage,
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TResponse | ErrorEvent;
  if (!response.ok) {
    const error = data as ErrorEvent;
    throw new ApiError(error.message ?? 'Request failed.', response.status, error.code ?? null);
  }

  return data as TResponse;
}

export async function createRoom(displayName: string): Promise<RoomCreatedEvent> {
  return postJson<RoomCreatedEvent>('/api/rooms', {
    type: 'create_room',
    displayName,
  });
}

export async function joinRoom(roomCode: string, displayName: string): Promise<RoomJoinedEvent> {
  return postJson<RoomJoinedEvent>('/api/rooms/join', {
    type: 'join_room',
    roomCode,
    displayName,
  });
}

export async function resumeRoom(
  roomCode: string,
  playerId: PlayerId,
  sessionToken: string,
): Promise<RoomResumedEvent> {
  return postJson<RoomResumedEvent>('/api/rooms/resume', {
    type: 'resume_room',
    roomCode,
    playerId,
    sessionToken,
  });
}

export function createRoomSocket(websocketPath: string, playerId: string, sessionToken: string): WebSocket {
  const url = new URL(`${getWebSocketBaseUrl()}${websocketPath}`);
  url.searchParams.set('playerId', playerId);
  url.searchParams.set('sessionToken', sessionToken);
  return new WebSocket(url);
}

export function sendSocketMessage(socket: WebSocket | null, message: ClientMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error('The Psyblr room connection is not open yet.');
  }

  socket.send(JSON.stringify(message));
}

export function parseServerEvent(rawMessage: string): ServerEvent {
  return JSON.parse(rawMessage) as ServerEvent;
}
