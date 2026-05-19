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

function isVercelHostname(hostname: string): boolean {
  return hostname === 'psyblr.vercel.app' || hostname.endsWith('.vercel.app');
}

export function getApiBaseUrl(): string {
  const configured = readOptionalEnvUrl(import.meta.env.VITE_API_BASE_URL);

  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  const { hostname, origin } = window.location;
  if (isLocalHostname(hostname)) {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  if (isVercelHostname(hostname)) {
    throw new ApiError(
      'This Psyblr deployment is missing VITE_API_BASE_URL. Set it to your deployed Cloudflare Worker origin before creating or joining rooms.',
      500,
      'missing_api_base_url',
    );
  }

  return trimTrailingSlash(origin);
}

function getWebSocketBaseUrl(): string {
  return getApiBaseUrl().replace(/^http/, 'ws');
}

function normalizeTextSnippet(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function isLikelyHtmlDocument(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html') || normalized.includes('<body');
}

function createInvalidResponseError(response: Response, rawBody: string): ApiError {
  const snippet = normalizeTextSnippet(rawBody);

  if (isLikelyHtmlDocument(rawBody) || snippet.toLowerCase().includes('the page could not be found')) {
    return new ApiError(
      'Psyblr could not reach its live room server. This frontend is likely pointing at the Vercel site instead of the Cloudflare Worker. Set VITE_API_BASE_URL to your deployed Worker origin.',
      response.status,
      'worker_not_reachable',
    );
  }

  if (!snippet) {
    return new ApiError('The Psyblr room server returned an empty response.', response.status, 'empty_response');
  }

  return new ApiError(
    `The Psyblr room server returned an unexpected response: ${snippet}`,
    response.status,
    'invalid_api_response',
  );
}

async function readJsonResponse<TResponse>(response: Response): Promise<TResponse | ErrorEvent> {
  const rawBody = await response.text();

  if (!rawBody) {
    throw new ApiError('The Psyblr room server returned an empty response.', response.status, 'empty_response');
  }

  try {
    return JSON.parse(rawBody) as TResponse | ErrorEvent;
  } catch {
    throw createInvalidResponseError(response, rawBody);
  }
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

  const data = await readJsonResponse<TResponse>(response);
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
