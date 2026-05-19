import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../config';

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));

  return Array.from(bytes, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join('');
}

export function generateSessionToken(): string {
  return crypto.randomUUID().replaceAll('-', '');
}
