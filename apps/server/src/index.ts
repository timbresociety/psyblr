import {
  API_PREFIX,
  INTERNAL_CREATE_ROOM_PATH,
  INTERNAL_JOIN_ROOM_PATH,
  INTERNAL_RESUME_ROOM_PATH,
  INTERNAL_SOCKET_PATH,
} from './config';
import type { CreateRoomMessage, JoinRoomMessage, ResumeRoomMessage } from './messages';
import { PsyblrRoom } from './durable-objects/PsyblrRoom';
import { applyCorsHeaders, corsPreflightResponse, errorResponse, readJson } from './lib/http';
import { generateRoomCode, normalizeRoomCode } from './lib/room-code';

export interface Env {
  PSYBLR_ROOM: DurableObjectNamespace;
}

function getRoomStub(env: Env, roomCode: string): DurableObjectStub {
  const roomId = env.PSYBLR_ROOM.idFromName(normalizeRoomCode(roomCode));
  return env.PSYBLR_ROOM.get(roomId);
}

async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  const payload = await readJson<CreateRoomMessage>(request);

  if (payload.type !== 'create_room') {
    return errorResponse(400, 'invalid_create_room', 'Expected a create_room payload.');
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomCode = generateRoomCode();
    const roomStub = getRoomStub(env, roomCode);
    const response = await roomStub.fetch(`https://psyblr.room${INTERNAL_CREATE_ROOM_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        ...payload,
        roomCode,
      }),
    });

    if (response.status !== 409) {
      return response;
    }
  }

  return errorResponse(500, 'room_code_exhausted', 'Could not allocate a unique room code.');
}

async function handleJoinRoom(request: Request, env: Env): Promise<Response> {
  const payload = await readJson<JoinRoomMessage>(request);

  if (payload.type !== 'join_room' || typeof payload.roomCode !== 'string') {
    return errorResponse(400, 'invalid_join_room', 'Expected a join_room payload with a room code.');
  }

  const roomCode = normalizeRoomCode(payload.roomCode);
  const roomStub = getRoomStub(env, roomCode);

  return roomStub.fetch(`https://psyblr.room${INTERNAL_JOIN_ROOM_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      ...payload,
      roomCode,
    }),
  });
}

async function handleResumeRoom(request: Request, env: Env): Promise<Response> {
  const payload = await readJson<ResumeRoomMessage>(request);

  if (
    payload.type !== 'resume_room' ||
    typeof payload.roomCode !== 'string' ||
    typeof payload.playerId !== 'string' ||
    typeof payload.sessionToken !== 'string'
  ) {
    return errorResponse(400, 'invalid_resume_room', 'Expected a resume_room payload with room credentials.');
  }

  const roomCode = normalizeRoomCode(payload.roomCode);
  const roomStub = getRoomStub(env, roomCode);

  return roomStub.fetch(`https://psyblr.room${INTERNAL_RESUME_ROOM_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      ...payload,
      roomCode,
    }),
  });
}

async function handleSocket(request: Request, env: Env, roomCode: string): Promise<Response> {
  const roomStub = getRoomStub(env, roomCode);
  const requestUrl = new URL(request.url);
  const internalUrl = new URL(`https://psyblr.room${INTERNAL_SOCKET_PATH}`);

  requestUrl.searchParams.forEach((value, key) => {
    internalUrl.searchParams.set(key, value);
  });

  const upgradedRequest = new Request(internalUrl.toString(), request);
  return roomStub.fetch(upgradedRequest);
}

export { PsyblrRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === 'OPTIONS' &&
      (url.pathname === `${API_PREFIX}/rooms` ||
        url.pathname === `${API_PREFIX}/rooms/join` ||
        url.pathname === `${API_PREFIX}/rooms/resume`)
    ) {
      return corsPreflightResponse(request);
    }

    if (request.method === 'POST' && url.pathname === `${API_PREFIX}/rooms`) {
      return applyCorsHeaders(await handleCreateRoom(request, env), request);
    }

    if (request.method === 'POST' && url.pathname === `${API_PREFIX}/rooms/join`) {
      return applyCorsHeaders(await handleJoinRoom(request, env), request);
    }

    if (request.method === 'POST' && url.pathname === `${API_PREFIX}/rooms/resume`) {
      return applyCorsHeaders(await handleResumeRoom(request, env), request);
    }

    const socketMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/socket$/);
    if (request.method === 'GET' && socketMatch) {
      return handleSocket(request, env, socketMatch[1]);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        product: 'Psyblr',
        routes: {
          createRoom: 'POST /api/rooms',
          joinRoom: 'POST /api/rooms/join',
          resumeRoom: 'POST /api/rooms/resume',
          openSocket: 'GET /api/rooms/:code/socket?playerId=player1|player2&sessionToken=...',
        },
      }),
      {
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      },
    );
  },
};
