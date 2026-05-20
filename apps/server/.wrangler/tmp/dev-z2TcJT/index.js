var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/config.ts
var API_PREFIX = "/api";
var INTERNAL_CREATE_ROOM_PATH = "/internal/create-room";
var INTERNAL_JOIN_ROOM_PATH = "/internal/join-room";
var INTERNAL_RESUME_ROOM_PATH = "/internal/resume-room";
var INTERNAL_SOCKET_PATH = "/internal/socket";
var ROOM_CODE_LENGTH = 6;
var ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var ROOM_STATE_STORAGE_KEY = "psyblr-room-state";
var ABANDONED_ROOM_TIMEOUT_MS = 30 * 60 * 1e3;

// src/durable-objects/PsyblrRoom.ts
import { DurableObject } from "cloudflare:workers";

// ../../packages/game-engine/dist/constants.js
var TOTAL_BUDGET = 69;
var STARTING_CARD_COUNT = 5;
var REPLENISHMENT_ROUNDS = 5;
var TOTAL_SELECTED_CARDS = 10;
var TOTAL_ROUNDS = 10;

// ../../packages/game-engine/dist/types.js
var PLAYER_IDS = ["player1", "player2"];
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// ../../packages/game-engine/dist/deck.js
var SUIT_SYMBOLS = {
  spades: "\u2660",
  clubs: "\u2663",
  hearts: "\u2665",
  diamonds: "\u2666"
};
var SUIT_SHORT_CODES = {
  spades: "S",
  clubs: "C",
  hearts: "H",
  diamonds: "D"
};
var PLAYER_SUITS = {
  player1: ["spades", "clubs"],
  player2: ["hearts", "diamonds"]
};
function getCardValue(rank) {
  if (rank === "A") {
    return 1;
  }
  if (rank === "J" || rank === "Q" || rank === "K") {
    return 10;
  }
  return Number(rank);
}
__name(getCardValue, "getCardValue");
function getCardColor(suit) {
  return suit === "spades" || suit === "clubs" ? "black" : "red";
}
__name(getCardColor, "getCardColor");
function formatSuitName(suit) {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
}
__name(formatSuitName, "formatSuitName");
function buildDeck() {
  const suits = ["spades", "clubs", "hearts", "diamonds"];
  const deck = [];
  for (const suit of suits) {
    for (const rank of RANKS) {
      const symbol = SUIT_SYMBOLS[suit];
      const shortCode = SUIT_SHORT_CODES[suit];
      deck.push({
        id: `${rank}${shortCode}`,
        rank,
        suit,
        color: getCardColor(suit),
        value: getCardValue(rank),
        shortLabel: `${rank}${symbol}`,
        displayLabel: `${rank} of ${formatSuitName(suit)}`,
        suitSymbol: symbol
      });
    }
  }
  return deck;
}
__name(buildDeck, "buildDeck");
function buildCardLookup(deck) {
  return deck.reduce((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});
}
__name(buildCardLookup, "buildCardLookup");
function getPlayerPool(deck, playerId) {
  const allowedSuits = new Set(PLAYER_SUITS[playerId]);
  return deck.filter((card) => allowedSuits.has(card.suit));
}
__name(getPlayerPool, "getPlayerPool");

// ../../packages/game-engine/dist/rounds.js
function isWicket(attackCard, defenseCard) {
  return attackCard.rank === defenseCard.rank;
}
__name(isWicket, "isWicket");
function resolveRound(attackCard, defenseCard, attackerAlreadyWicketed) {
  const wicket = isWicket(attackCard, defenseCard);
  if (attackerAlreadyWicketed || wicket) {
    return {
      points: 0,
      wicket
    };
  }
  if (attackCard.value > defenseCard.value) {
    return {
      points: attackCard.value - defenseCard.value,
      wicket: false
    };
  }
  return {
    points: 0,
    wicket: false
  };
}
__name(resolveRound, "resolveRound");

// ../../packages/game-engine/dist/turns.js
function getOpponent(playerId) {
  return playerId === "player1" ? "player2" : "player1";
}
__name(getOpponent, "getOpponent");
function getAttackerForRound(roundNumber) {
  return roundNumber % 2 === 1 ? "player1" : "player2";
}
__name(getAttackerForRound, "getAttackerForRound");
function getDefenderForRound(roundNumber) {
  return getOpponent(getAttackerForRound(roundNumber));
}
__name(getDefenderForRound, "getDefenderForRound");

// ../../packages/game-engine/dist/validation.js
function makeInvalid(reason) {
  return {
    valid: false,
    reason
  };
}
__name(makeInvalid, "makeInvalid");
function getCardsByIds(cardIds, cardsById) {
  return cardIds.map((cardId) => cardsById[cardId]).filter(Boolean);
}
__name(getCardsByIds, "getCardsByIds");
function sumCardValues(cardIds, cardsById) {
  return getCardsByIds(cardIds, cardsById).reduce((total, card) => total + card.value, 0);
}
__name(sumCardValues, "sumCardValues");
function getRemainingPoolCards(player, cardsById, additionalSelectedIds = []) {
  const takenCardIds = /* @__PURE__ */ new Set([...player.selectedCardIds, ...additionalSelectedIds]);
  return player.poolCardIds.filter((cardId) => !takenCardIds.has(cardId)).map((cardId) => cardsById[cardId]);
}
__name(getRemainingPoolCards, "getRemainingPoolCards");
function getMinimumFutureSpend(player, cardsById, additionalSelectedIds) {
  const cardsNeeded = TOTAL_SELECTED_CARDS - (player.selectedCardIds.length + additionalSelectedIds.length);
  if (cardsNeeded <= 0) {
    return 0;
  }
  const remaining = getRemainingPoolCards(player, cardsById, additionalSelectedIds).map((card) => card.value).sort((left, right) => left - right);
  if (remaining.length < cardsNeeded) {
    return Number.POSITIVE_INFINITY;
  }
  return remaining.slice(0, cardsNeeded).reduce((total, value) => total + value, 0);
}
__name(getMinimumFutureSpend, "getMinimumFutureSpend");
function ensureCardIdsAreUnique(cardIds) {
  if (new Set(cardIds).size !== cardIds.length) {
    return makeInvalid("Each card can only be selected once.");
  }
  return { valid: true };
}
__name(ensureCardIdsAreUnique, "ensureCardIdsAreUnique");
function validateBudgetForAdditionalCards(player, additionalCardIds, cardsById) {
  const uniqueValidation = ensureCardIdsAreUnique(additionalCardIds);
  if (!uniqueValidation.valid) {
    return uniqueValidation;
  }
  const invalidPoolCard = additionalCardIds.find((cardId) => !player.poolCardIds.includes(cardId));
  if (invalidPoolCard) {
    return makeInvalid("Selected cards must come from the active player pool.");
  }
  const alreadyOwnedCard = additionalCardIds.find((cardId) => player.selectedCardIds.includes(cardId));
  if (alreadyOwnedCard) {
    return makeInvalid("A selected card cannot be bought twice.");
  }
  if (player.selectedCardIds.length + additionalCardIds.length > TOTAL_SELECTED_CARDS) {
    return makeInvalid(`Each player must select exactly ${TOTAL_SELECTED_CARDS} cards over the full game.`);
  }
  const proposedSpend = player.spent + sumCardValues(additionalCardIds, cardsById);
  if (proposedSpend > TOTAL_BUDGET) {
    return makeInvalid(`Selections cannot exceed the total budget of ${TOTAL_BUDGET}.`);
  }
  const minimumFutureSpend = getMinimumFutureSpend(player, cardsById, additionalCardIds);
  if (proposedSpend + minimumFutureSpend > TOTAL_BUDGET) {
    return makeInvalid("This choice leaves too little budget to complete all 10 card selections.");
  }
  return { valid: true };
}
__name(validateBudgetForAdditionalCards, "validateBudgetForAdditionalCards");
function validateStartingSelection(player, cardIds, cardsById) {
  if (cardIds.length !== STARTING_CARD_COUNT) {
    return makeInvalid(`Choose exactly ${STARTING_CARD_COUNT} starting cards.`);
  }
  return validateBudgetForAdditionalCards(player, cardIds, cardsById);
}
__name(validateStartingSelection, "validateStartingSelection");
function validateReplenishmentPurchase(player, cardId, cardsById, roundNumber) {
  if (roundNumber < 1 || roundNumber > REPLENISHMENT_ROUNDS) {
    return makeInvalid(`Replenishment only happens after rounds 1 to ${REPLENISHMENT_ROUNDS}.`);
  }
  if (player.selectedCardIds.length < STARTING_CARD_COUNT) {
    return makeInvalid("Starting hands must be completed before replenishment.");
  }
  if (player.selectedCardIds.length >= TOTAL_SELECTED_CARDS) {
    return makeInvalid(`Each player can only select ${TOTAL_SELECTED_CARDS} cards total.`);
  }
  return validateBudgetForAdditionalCards(player, [cardId], cardsById);
}
__name(validateReplenishmentPurchase, "validateReplenishmentPurchase");
function validatePlayableCard(player, cardId) {
  if (!player.handCardIds.includes(cardId)) {
    return makeInvalid("Choose one card from the current hand.");
  }
  return { valid: true };
}
__name(validatePlayableCard, "validatePlayableCard");

// ../../packages/game-engine/dist/winner.js
function getWinner(scores) {
  if (scores.player1 > scores.player2) {
    return "player1";
  }
  if (scores.player2 > scores.player1) {
    return "player2";
  }
  return "draw";
}
__name(getWinner, "getWinner");

// src/lib/http.ts
var LOCAL_ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);
function readConfiguredOrigins(value) {
  if (!value) {
    return /* @__PURE__ */ new Set();
  }
  return new Set(
    value.split(",").map((origin) => origin.trim()).filter(Boolean)
  );
}
__name(readConfiguredOrigins, "readConfiguredOrigins");
function isPreviewVercelHostname(hostname) {
  return hostname.startsWith("psyblr-") && hostname.endsWith(".vercel.app");
}
__name(isPreviewVercelHostname, "isPreviewVercelHostname");
function isAllowedOrigin(origin, configuredOrigins) {
  if (LOCAL_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }
  if (configuredOrigins.has(origin)) {
    return true;
  }
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname === "psyblr.vercel.app" || isPreviewVercelHostname(url.hostname));
  } catch {
    return false;
  }
}
__name(isAllowedOrigin, "isAllowedOrigin");
function applyCorsHeaders(response, request, corsAllowedOrigins) {
  const origin = request.headers.get("origin");
  const configuredOrigins = readConfiguredOrigins(corsAllowedOrigins);
  if (!origin || !isAllowedOrigin(origin, configuredOrigins)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(applyCorsHeaders, "applyCorsHeaders");
function corsPreflightResponse(request, corsAllowedOrigins) {
  const response = new Response(null, {
    status: 204
  });
  return applyCorsHeaders(response, request, corsAllowedOrigins);
}
__name(corsPreflightResponse, "corsPreflightResponse");
async function readJson(request) {
  return await request.json();
}
__name(readJson, "readJson");
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(status, code, message) {
  const body = {
    type: "error",
    code,
    message
  };
  return jsonResponse(body, status);
}
__name(errorResponse, "errorResponse");

// src/lib/room-code.ts
function normalizeRoomCode(roomCode) {
  return roomCode.trim().toUpperCase();
}
__name(normalizeRoomCode, "normalizeRoomCode");
function generateRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join("");
}
__name(generateRoomCode, "generateRoomCode");
function generateSessionToken() {
  return crypto.randomUUID().replaceAll("-", "");
}
__name(generateSessionToken, "generateSessionToken");

// src/lib/room-state.ts
var PLAYER_COLORS = {
  player1: "black",
  player2: "red"
};
var DEFAULT_NAMES = {
  player1: "Player 1",
  player2: "Player 2"
};
var ROOM_DECK = buildDeck();
var ROOM_CARDS_BY_ID = buildCardLookup(ROOM_DECK);
function getFutureIso(baseDate, deltaMs) {
  return new Date(baseDate.getTime() + deltaMs).toISOString();
}
__name(getFutureIso, "getFutureIso");
function createLockedChoiceState() {
  return {
    startingHands: {},
    roundCards: {},
    replenishments: {},
    nextPhaseReady: {}
  };
}
__name(createLockedChoiceState, "createLockedChoiceState");
function createRoomPlayerState(playerId, displayName, sessionToken) {
  const normalizedName = displayName.trim() || DEFAULT_NAMES[playerId];
  const poolCardIds = getPlayerPool(ROOM_DECK, playerId).map((card) => card.id);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: playerId,
    name: normalizedName,
    displayName: normalizedName,
    color: PLAYER_COLORS[playerId],
    sessionToken,
    connected: false,
    disconnectedAt: nowIso,
    ready: false,
    joinedAt: nowIso,
    spent: 0,
    budgetRemaining: TOTAL_BUDGET,
    startingSpend: 0,
    score: 0,
    wicketed: false,
    poolCardIds,
    selectedCardIds: [],
    handCardIds: [],
    startingHandCardIds: [],
    replenishmentCardIds: [],
    remainingPoolCardIds: [...poolCardIds]
  };
}
__name(createRoomPlayerState, "createRoomPlayerState");
function createRoomState(roomCode, hostName, sessionToken) {
  const createdAt = /* @__PURE__ */ new Date();
  const roomState = {
    roomCode,
    createdAt: createdAt.toISOString(),
    lastActivityAt: createdAt.toISOString(),
    abandonmentExpiresAt: null,
    phase: "lobby",
    roundNumber: 1,
    attacker: getAttackerForRound(1),
    defender: getDefenderForRound(1),
    openingSpendRevealed: false,
    players: {
      player1: createRoomPlayerState("player1", hostName, sessionToken)
    },
    discardHistory: [],
    lockedChoices: createLockedChoiceState(),
    winner: null
  };
  ensureRoomAbandonmentDeadline(roomState, createdAt);
  return roomState;
}
__name(createRoomState, "createRoomState");
function getJoinedPlayerIds(roomState) {
  return PLAYER_IDS.filter((playerId) => Boolean(roomState.players[playerId]));
}
__name(getJoinedPlayerIds, "getJoinedPlayerIds");
function getJoinedPlayers(roomState) {
  return getJoinedPlayerIds(roomState).map((playerId) => roomState.players[playerId]).filter((player) => Boolean(player));
}
__name(getJoinedPlayers, "getJoinedPlayers");
function hasConnectedPlayers(roomState) {
  return getJoinedPlayers(roomState).some((player) => player.connected);
}
__name(hasConnectedPlayers, "hasConnectedPlayers");
function areBothPlayersPresent(roomState) {
  return getJoinedPlayers(roomState).length === PLAYER_IDS.length;
}
__name(areBothPlayersPresent, "areBothPlayersPresent");
function areBothPlayersReady(roomState) {
  return areBothPlayersPresent(roomState) && getJoinedPlayers(roomState).every((player) => player.ready);
}
__name(areBothPlayersReady, "areBothPlayersReady");
function areAllPhaseReady(roomState) {
  return getJoinedPlayerIds(roomState).every((playerId) => roomState.lockedChoices.nextPhaseReady[playerId] === true);
}
__name(areAllPhaseReady, "areAllPhaseReady");
function createPublicPlayerStateView(roomState, playerId) {
  const player = roomState.players[playerId];
  if (!player) {
    return null;
  }
  return {
    id: player.id,
    displayName: player.displayName,
    color: player.color,
    connected: player.connected,
    ready: player.ready,
    score: player.score,
    wicketed: player.wicketed,
    selectedCount: player.selectedCardIds.length,
    startingSpend: roomState.openingSpendRevealed ? player.startingSpend : null
  };
}
__name(createPublicPlayerStateView, "createPublicPlayerStateView");
function createPublicMatchStateView(roomState) {
  return {
    roomCode: roomState.roomCode,
    phase: roomState.phase,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender,
    openingSpendRevealed: roomState.openingSpendRevealed,
    winner: roomState.winner,
    discardHistory: [...roomState.discardHistory],
    players: PLAYER_IDS.map((playerId) => createPublicPlayerStateView(roomState, playerId)).filter(
      (player) => Boolean(player)
    )
  };
}
__name(createPublicMatchStateView, "createPublicMatchStateView");
function createLobbyStateEvent(roomState) {
  return {
    type: "lobby_state",
    state: createPublicMatchStateView(roomState)
  };
}
__name(createLobbyStateEvent, "createLobbyStateEvent");
function getCurrentLockedChoice(roomState, playerId) {
  switch (roomState.phase) {
    case "setup":
    case "opening-reveal":
      return roomState.lockedChoices.startingHands[playerId] ?? null;
    case "round":
    case "round-reveal":
    case "finished":
      return roomState.lockedChoices.roundCards[playerId] ?? null;
    case "replenishment":
    case "replenishment-reveal":
      return roomState.lockedChoices.replenishments[playerId] ?? null;
    case "lobby":
      return null;
  }
}
__name(getCurrentLockedChoice, "getCurrentLockedChoice");
function createPrivatePlayerStateView(roomState, playerId) {
  const player = roomState.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} is not registered in room ${roomState.roomCode}.`);
  }
  return {
    phase: roomState.phase,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender,
    spent: player.spent,
    budgetRemaining: player.budgetRemaining,
    startingSpend: player.startingSpend,
    score: player.score,
    wicketed: player.wicketed,
    selectedCardIds: [...player.selectedCardIds],
    handCardIds: [...player.handCardIds],
    startingHandCardIds: [...player.startingHandCardIds],
    replenishmentCardIds: [...player.replenishmentCardIds],
    remainingPoolCardIds: [...player.remainingPoolCardIds],
    currentLockedChoice: getCurrentLockedChoice(roomState, playerId)
  };
}
__name(createPrivatePlayerStateView, "createPrivatePlayerStateView");
function createPrivateStateEvent(roomState, playerId) {
  return {
    type: "private_state",
    roomCode: roomState.roomCode,
    playerId,
    state: createPrivatePlayerStateView(roomState, playerId)
  };
}
__name(createPrivateStateEvent, "createPrivateStateEvent");
function markRoomActivity(roomState, now = /* @__PURE__ */ new Date()) {
  roomState.lastActivityAt = now.toISOString();
}
__name(markRoomActivity, "markRoomActivity");
function clearRoomAbandonmentDeadline(roomState) {
  roomState.abandonmentExpiresAt = null;
}
__name(clearRoomAbandonmentDeadline, "clearRoomAbandonmentDeadline");
function ensureRoomAbandonmentDeadline(roomState, now = /* @__PURE__ */ new Date()) {
  if (hasConnectedPlayers(roomState)) {
    roomState.abandonmentExpiresAt = null;
    return "";
  }
  const existingTimestamp = roomState.abandonmentExpiresAt ? Date.parse(roomState.abandonmentExpiresAt) : Number.NaN;
  if (Number.isFinite(existingTimestamp) && existingTimestamp > now.getTime()) {
    return roomState.abandonmentExpiresAt;
  }
  const deadline = getFutureIso(now, ABANDONED_ROOM_TIMEOUT_MS);
  roomState.abandonmentExpiresAt = deadline;
  return deadline;
}
__name(ensureRoomAbandonmentDeadline, "ensureRoomAbandonmentDeadline");
function isRoomExpired(roomState, now = /* @__PURE__ */ new Date()) {
  if (!roomState.abandonmentExpiresAt) {
    return false;
  }
  return Date.parse(roomState.abandonmentExpiresAt) <= now.getTime();
}
__name(isRoomExpired, "isRoomExpired");
function updatePlayerConnectionState(roomState, playerId, connected, now = /* @__PURE__ */ new Date()) {
  const player = roomState.players[playerId];
  if (!player) {
    return;
  }
  player.connected = connected;
  player.disconnectedAt = connected ? null : now.toISOString();
  markRoomActivity(roomState, now);
  if (hasConnectedPlayers(roomState)) {
    clearRoomAbandonmentDeadline(roomState);
    return;
  }
  ensureRoomAbandonmentDeadline(roomState, now);
}
__name(updatePlayerConnectionState, "updatePlayerConnectionState");
function clearPhaseReadyState(roomState) {
  roomState.lockedChoices.nextPhaseReady = {};
}
__name(clearPhaseReadyState, "clearPhaseReadyState");
function resetRoundLocks(roomState) {
  roomState.lockedChoices.roundCards = {};
}
__name(resetRoundLocks, "resetRoundLocks");
function resetReplenishmentLocks(roomState) {
  roomState.lockedChoices.replenishments = {};
}
__name(resetReplenishmentLocks, "resetReplenishmentLocks");
function getOpeningSpends(roomState) {
  return {
    player1: roomState.players.player1?.startingSpend ?? 0,
    player2: roomState.players.player2?.startingSpend ?? 0
  };
}
__name(getOpeningSpends, "getOpeningSpends");
function getScoreRecord(roomState) {
  return {
    player1: roomState.players.player1?.score ?? 0,
    player2: roomState.players.player2?.score ?? 0
  };
}
__name(getScoreRecord, "getScoreRecord");
function normalizePlayerName(playerId, displayName) {
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_NAMES[playerId];
}
__name(normalizePlayerName, "normalizePlayerName");

// src/lib/room-gameplay.ts
function invalid(code, message) {
  return {
    ok: false,
    error: {
      type: "error",
      code,
      message
    }
  };
}
__name(invalid, "invalid");
function success(events = []) {
  return {
    ok: true,
    events
  };
}
__name(success, "success");
function requirePlayer(roomState, playerId) {
  return roomState.players[playerId] ?? null;
}
__name(requirePlayer, "requirePlayer");
function createRoundStartedEvent(roomState) {
  return {
    type: "round_started",
    roomCode: roomState.roomCode,
    roundNumber: roomState.roundNumber,
    attacker: roomState.attacker,
    defender: roomState.defender
  };
}
__name(createRoundStartedEvent, "createRoundStartedEvent");
function createSetupStartedEvent(roomState) {
  return {
    type: "setup_started",
    roomCode: roomState.roomCode,
    roundNumber: roomState.roundNumber,
    startingCardCount: STARTING_CARD_COUNT
  };
}
__name(createSetupStartedEvent, "createSetupStartedEvent");
function setRoundPhase(roomState, roundNumber) {
  roomState.phase = "round";
  roomState.roundNumber = roundNumber;
  roomState.attacker = getAttackerForRound(roundNumber);
  roomState.defender = getDefenderForRound(roundNumber);
  resetRoundLocks(roomState);
  clearPhaseReadyState(roomState);
  return createRoundStartedEvent(roomState);
}
__name(setRoundPhase, "setRoundPhase");
function buildRoundRecord(roomState, attackCardId, defenseCardId) {
  const attackerId = roomState.attacker;
  const defenderId = roomState.defender;
  const attacker = roomState.players[attackerId];
  if (!attacker) {
    throw new Error(`Missing attacker state for ${attackerId}.`);
  }
  const outcome = resolveRound(ROOM_CARDS_BY_ID[attackCardId], ROOM_CARDS_BY_ID[defenseCardId], attacker.wicketed);
  attacker.score += outcome.points;
  attacker.wicketed = attacker.wicketed || outcome.wicket;
  return {
    roundNumber: roomState.roundNumber,
    attacker: attackerId,
    defender: defenderId,
    attackCardId,
    defenseCardId,
    attackCardValue: ROOM_CARDS_BY_ID[attackCardId].value,
    defenseCardValue: ROOM_CARDS_BY_ID[defenseCardId].value,
    attackRank: ROOM_CARDS_BY_ID[attackCardId].rank,
    defenseRank: ROOM_CARDS_BY_ID[defenseCardId].rank,
    pointsScored: outcome.points,
    wicket: outcome.wicket,
    attackerWicketedAfterRound: attacker.wicketed,
    scoresAfterRound: getScoreRecord(roomState)
  };
}
__name(buildRoundRecord, "buildRoundRecord");
function applyPlayerReadyIntent(roomState, playerId, ready) {
  if (roomState.phase !== "lobby") {
    return invalid("invalid_phase", "player_ready is only valid while the room is in the lobby.");
  }
  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid("player_not_found", "This player seat is not registered in the room.");
  }
  player.ready = ready;
  if (!areBothPlayersReady(roomState)) {
    return success();
  }
  roomState.phase = "setup";
  clearPhaseReadyState(roomState);
  return success([createSetupStartedEvent(roomState)]);
}
__name(applyPlayerReadyIntent, "applyPlayerReadyIntent");
function applyStartingHandIntent(roomState, playerId, cardIds) {
  if (roomState.phase !== "setup") {
    return invalid("invalid_phase", "submit_starting_hand is only valid during setup.");
  }
  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid("player_not_found", "This player seat is not registered in the room.");
  }
  if (roomState.lockedChoices.startingHands[playerId]) {
    return invalid("starting_hand_already_submitted", "Starting hand has already been submitted.");
  }
  const validation = validateStartingSelection(player, cardIds, ROOM_CARDS_BY_ID);
  if (!validation.valid) {
    return invalid("invalid_starting_hand", validation.reason ?? "Starting hand validation failed.");
  }
  const spend = cardIds.reduce((total, cardId) => total + ROOM_CARDS_BY_ID[cardId].value, 0);
  player.selectedCardIds = [...cardIds];
  player.handCardIds = [...cardIds];
  player.startingHandCardIds = [...cardIds];
  player.spent = spend;
  player.startingSpend = spend;
  player.budgetRemaining = TOTAL_BUDGET - spend;
  player.remainingPoolCardIds = player.remainingPoolCardIds.filter((cardId) => !cardIds.includes(cardId));
  roomState.lockedChoices.startingHands[playerId] = [...cardIds];
  const bothSubmitted = PLAYER_IDS.every((id) => Array.isArray(roomState.lockedChoices.startingHands[id]));
  if (!bothSubmitted) {
    return success();
  }
  roomState.phase = "opening-reveal";
  roomState.openingSpendRevealed = true;
  clearPhaseReadyState(roomState);
  const event = {
    type: "opening_spend_revealed",
    roomCode: roomState.roomCode,
    spends: getOpeningSpends(roomState)
  };
  return success([event]);
}
__name(applyStartingHandIntent, "applyStartingHandIntent");
function applyRoundCardIntent(roomState, playerId, cardId) {
  if (roomState.phase !== "round") {
    return invalid("invalid_phase", "lock_round_card is only valid during a live round.");
  }
  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid("player_not_found", "This player seat is not registered in the room.");
  }
  if (roomState.lockedChoices.roundCards[playerId]) {
    return invalid("round_card_already_locked", "This player has already locked a round card.");
  }
  const validation = validatePlayableCard(player, cardId);
  if (!validation.valid) {
    return invalid("invalid_round_card", validation.reason ?? "Round card validation failed.");
  }
  roomState.lockedChoices.roundCards[playerId] = cardId;
  player.handCardIds = player.handCardIds.filter((currentCardId) => currentCardId !== cardId);
  const bothLocked = PLAYER_IDS.every((id) => typeof roomState.lockedChoices.roundCards[id] === "string");
  if (!bothLocked) {
    return success();
  }
  const attackCardId = roomState.lockedChoices.roundCards[roomState.attacker];
  const defenseCardId = roomState.lockedChoices.roundCards[roomState.defender];
  if (!attackCardId || !defenseCardId) {
    return invalid("round_resolution_failed", "Could not resolve the round because one lock is missing.");
  }
  const roundRecord = buildRoundRecord(roomState, attackCardId, defenseCardId);
  roomState.discardHistory.push(roundRecord);
  const resolvedEvent = {
    type: "round_resolved",
    roomCode: roomState.roomCode,
    round: roundRecord,
    discardCount: roomState.discardHistory.length
  };
  if (roomState.roundNumber >= TOTAL_ROUNDS) {
    roomState.phase = "finished";
    roomState.winner = getWinner(getScoreRecord(roomState));
    return success([
      resolvedEvent,
      {
        type: "match_finished",
        roomCode: roomState.roomCode,
        winner: roomState.winner,
        scores: getScoreRecord(roomState)
      }
    ]);
  }
  roomState.phase = "round-reveal";
  clearPhaseReadyState(roomState);
  return success([resolvedEvent]);
}
__name(applyRoundCardIntent, "applyRoundCardIntent");
function applyReplenishmentIntent(roomState, playerId, cardId) {
  if (roomState.phase !== "replenishment") {
    return invalid("invalid_phase", "buy_replenishment_card is only valid during replenishment.");
  }
  const player = requirePlayer(roomState, playerId);
  if (!player) {
    return invalid("player_not_found", "This player seat is not registered in the room.");
  }
  if (roomState.lockedChoices.replenishments[playerId]) {
    return invalid("replenishment_already_locked", "This player has already locked a replenishment card.");
  }
  const validation = validateReplenishmentPurchase(player, cardId, ROOM_CARDS_BY_ID, roomState.roundNumber);
  if (!validation.valid) {
    return invalid(
      "invalid_replenishment_card",
      validation.reason ?? "Replenishment validation failed."
    );
  }
  const cardValue = ROOM_CARDS_BY_ID[cardId].value;
  player.selectedCardIds = [...player.selectedCardIds, cardId];
  player.handCardIds = [...player.handCardIds, cardId];
  player.replenishmentCardIds = [...player.replenishmentCardIds, cardId];
  player.remainingPoolCardIds = player.remainingPoolCardIds.filter((currentCardId) => currentCardId !== cardId);
  player.spent += cardValue;
  player.budgetRemaining = TOTAL_BUDGET - player.spent;
  roomState.lockedChoices.replenishments[playerId] = cardId;
  const bothLocked = PLAYER_IDS.every((id) => typeof roomState.lockedChoices.replenishments[id] === "string");
  if (!bothLocked) {
    return success();
  }
  roomState.phase = "replenishment-reveal";
  clearPhaseReadyState(roomState);
  const event = {
    type: "replenishment_resolved",
    roomCode: roomState.roomCode,
    afterRound: roomState.roundNumber,
    nextRound: roomState.roundNumber + 1
  };
  return success([event]);
}
__name(applyReplenishmentIntent, "applyReplenishmentIntent");
function applyNextPhaseReadyIntent(roomState, playerId) {
  if (!["opening-reveal", "round-reveal", "replenishment-reveal"].includes(roomState.phase)) {
    return invalid("invalid_phase", "next_phase_ready is not valid in the current room phase.");
  }
  if (!requirePlayer(roomState, playerId)) {
    return invalid("player_not_found", "This player seat is not registered in the room.");
  }
  roomState.lockedChoices.nextPhaseReady[playerId] = true;
  if (!areAllPhaseReady(roomState)) {
    return success();
  }
  clearPhaseReadyState(roomState);
  if (roomState.phase === "opening-reveal") {
    return success([setRoundPhase(roomState, 1)]);
  }
  if (roomState.phase === "round-reveal") {
    if (roomState.roundNumber <= REPLENISHMENT_ROUNDS) {
      roomState.phase = "replenishment";
      resetReplenishmentLocks(roomState);
      clearPhaseReadyState(roomState);
      return success([
        {
          type: "replenishment_started",
          roomCode: roomState.roomCode,
          afterRound: roomState.roundNumber
        }
      ]);
    }
    return success([setRoundPhase(roomState, roomState.roundNumber + 1)]);
  }
  return success([setRoundPhase(roomState, roomState.roundNumber + 1)]);
}
__name(applyNextPhaseReadyIntent, "applyNextPhaseReadyIntent");

// src/durable-objects/PsyblrRoom.ts
var PsyblrRoom = class extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.roomState = null;
    this.socketsByPlayer = /* @__PURE__ */ new Map();
    this.playerBySocket = /* @__PURE__ */ new Map();
    this.durableState = state;
    this.durableState.blockConcurrencyWhile(async () => {
      const storedState = await this.durableState.storage.get(ROOM_STATE_STORAGE_KEY);
      if (!storedState) {
        return;
      }
      this.roomState = storedState;
      const now = /* @__PURE__ */ new Date();
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
  static {
    __name(this, "PsyblrRoom");
  }
  async fetch(request) {
    await this.expireRoomIfNeeded();
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === INTERNAL_CREATE_ROOM_PATH) {
      return this.handleCreateRoom(request);
    }
    if (request.method === "POST" && url.pathname === INTERNAL_JOIN_ROOM_PATH) {
      return this.handleJoinRoom(request);
    }
    if (request.method === "POST" && url.pathname === INTERNAL_RESUME_ROOM_PATH) {
      return this.handleResumeRoom(request);
    }
    if (request.method === "GET" && url.pathname === INTERNAL_SOCKET_PATH) {
      return this.handleSocketUpgrade(request);
    }
    return errorResponse(404, "room_route_not_found", "Route not found inside PsyblrRoom.");
  }
  async handleCreateRoom(request) {
    const payload = await readJson(request);
    if (payload.type !== "create_room" || typeof payload.roomCode !== "string") {
      return errorResponse(400, "invalid_create_room", "Expected a create_room payload.");
    }
    if (this.roomState) {
      return errorResponse(409, "room_already_exists", "This room code is already in use.");
    }
    const roomCode = payload.roomCode;
    const sessionToken = generateSessionToken();
    this.roomState = createRoomState(roomCode, normalizePlayerName("player1", payload.displayName), sessionToken);
    await this.persistRoomState();
    const event = {
      type: "room_created",
      roomCode,
      playerId: "player1",
      sessionToken,
      websocketPath: `/api/rooms/${roomCode}/socket`,
      phase: this.roomState.phase
    };
    return jsonResponse(event, 201);
  }
  async handleJoinRoom(request) {
    const payload = await readJson(request);
    if (payload.type !== "join_room") {
      return errorResponse(400, "invalid_join_room", "Expected a join_room payload.");
    }
    if (!this.roomState) {
      return errorResponse(404, "room_not_found", "That room code does not exist.");
    }
    const roomState = this.roomState;
    if (payload.roomCode !== roomState.roomCode) {
      return errorResponse(404, "room_not_found", "That room code does not match this room instance.");
    }
    if (roomState.players.player2) {
      return errorResponse(409, "room_full", "This room already has two players.");
    }
    const sessionToken = generateSessionToken();
    roomState.players.player2 = createRoomPlayerState(
      "player2",
      normalizePlayerName("player2", payload.displayName),
      sessionToken
    );
    this.refreshAbandonmentWindow(/* @__PURE__ */ new Date());
    await this.persistRoomState();
    this.broadcastLobbyState();
    const event = {
      type: "room_joined",
      roomCode: roomState.roomCode,
      playerId: "player2",
      sessionToken,
      websocketPath: `/api/rooms/${roomState.roomCode}/socket`,
      phase: roomState.phase
    };
    return jsonResponse(event, 200);
  }
  async handleResumeRoom(request) {
    const payload = await readJson(request);
    if (payload.type !== "resume_room") {
      return errorResponse(400, "invalid_resume_room", "Expected a resume_room payload.");
    }
    if (!this.roomState) {
      return errorResponse(404, "room_not_found", "That room no longer exists.");
    }
    const roomState = this.roomState;
    if (payload.roomCode !== roomState.roomCode) {
      return errorResponse(404, "room_not_found", "That room code does not match this room instance.");
    }
    const player = roomState.players[payload.playerId];
    if (!player) {
      return errorResponse(404, "player_not_found", "That player seat is no longer available in this room.");
    }
    if (payload.sessionToken !== player.sessionToken) {
      return errorResponse(401, "invalid_session_token", "That saved seat token is no longer valid.");
    }
    this.refreshAbandonmentWindow(/* @__PURE__ */ new Date());
    await this.persistRoomState();
    const event = {
      type: "room_resumed",
      roomCode: roomState.roomCode,
      playerId: payload.playerId,
      sessionToken: player.sessionToken,
      websocketPath: `/api/rooms/${roomState.roomCode}/socket`,
      phase: roomState.phase
    };
    return jsonResponse(event, 200);
  }
  async handleSocketUpgrade(request) {
    if (!this.roomState) {
      return errorResponse(404, "room_not_found", "That room code does not exist.");
    }
    const roomState = this.roomState;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const sessionToken = url.searchParams.get("sessionToken");
    if (!playerId || !PLAYER_IDS.includes(playerId)) {
      return errorResponse(400, "missing_player_id", "Provide a valid playerId query parameter.");
    }
    const player = roomState.players[playerId];
    if (!player) {
      return errorResponse(404, "player_not_found", "That player seat has not joined this room.");
    }
    if (!sessionToken || sessionToken !== player.sessionToken) {
      return errorResponse(401, "invalid_session_token", "Provide a valid room session token.");
    }
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return errorResponse(426, "websocket_upgrade_required", "Use a WebSocket upgrade request for this route.");
    }
    const pair = new WebSocketPair();
    const clientSocket = pair[0];
    const serverSocket = pair[1];
    serverSocket.accept();
    this.registerSocket(playerId, serverSocket);
    updatePlayerConnectionState(roomState, playerId, true, /* @__PURE__ */ new Date());
    await this.persistRoomState();
    serverSocket.addEventListener("message", (event) => {
      void this.handleSocketMessage(serverSocket, playerId, event.data);
    });
    serverSocket.addEventListener("close", () => {
      void this.handleSocketClose(serverSocket);
    });
    serverSocket.addEventListener("error", () => {
      void this.handleSocketClose(serverSocket);
    });
    this.sendPrivateState(playerId);
    this.broadcastLobbyState();
    return new Response(null, {
      status: 101,
      webSocket: clientSocket
    });
  }
  async handleSocketMessage(socket, playerId, rawData) {
    try {
      const jsonText = typeof rawData === "string" ? rawData : new TextDecoder().decode(rawData);
      const message = JSON.parse(jsonText);
      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        this.sendError(socket, "invalid_message", "Expected a valid Psyblr client message.");
        return;
      }
      switch (message.type) {
        case "player_ready":
          await this.handlePlayerReady(playerId, message);
          return;
        case "submit_starting_hand":
          await this.handleStartingHand(playerId, message);
          return;
        case "lock_round_card":
          await this.handleRoundCardLock(playerId, message);
          return;
        case "buy_replenishment_card":
          await this.handleReplenishmentBuy(playerId, message);
          return;
        case "next_phase_ready":
          await this.handleNextPhaseReady(playerId, message);
          return;
        case "create_room":
        case "join_room":
        case "resume_room":
          this.sendError(socket, "http_only_message", `${message.type} is only supported via HTTP routes.`);
      }
    } catch {
      this.sendError(socket, "invalid_json", "Could not parse the socket message payload.");
    }
  }
  async handlePlayerReady(playerId, message) {
    await this.applyTransition(playerId, applyPlayerReadyIntent(this.requireRoomState(), playerId, message.ready));
  }
  async handleStartingHand(playerId, message) {
    await this.applyTransition(playerId, applyStartingHandIntent(this.requireRoomState(), playerId, message.cardIds));
  }
  async handleRoundCardLock(playerId, message) {
    await this.applyTransition(playerId, applyRoundCardIntent(this.requireRoomState(), playerId, message.cardId));
  }
  async handleReplenishmentBuy(playerId, message) {
    await this.applyTransition(playerId, applyReplenishmentIntent(this.requireRoomState(), playerId, message.cardId));
  }
  async handleNextPhaseReady(playerId, _message) {
    await this.applyTransition(playerId, applyNextPhaseReadyIntent(this.requireRoomState(), playerId));
  }
  registerSocket(playerId, socket) {
    const existingSockets = this.socketsByPlayer.get(playerId) ?? /* @__PURE__ */ new Set();
    existingSockets.add(socket);
    this.socketsByPlayer.set(playerId, existingSockets);
    this.playerBySocket.set(socket, playerId);
  }
  async handleSocketClose(socket) {
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
    updatePlayerConnectionState(roomState, playerId, (this.socketsByPlayer.get(playerId)?.size ?? 0) > 0, /* @__PURE__ */ new Date());
    await this.persistRoomState();
    this.broadcastLobbyState();
  }
  async alarm() {
    await this.expireRoomIfNeeded();
  }
  broadcastLobbyState() {
    if (!this.roomState) {
      return;
    }
    this.broadcastEvent(createLobbyStateEvent(this.roomState));
  }
  broadcastPrivateStates() {
    if (!this.roomState) {
      return;
    }
    for (const playerId of getJoinedPlayerIds(this.roomState)) {
      this.sendPrivateState(playerId);
    }
  }
  sendPrivateState(playerId) {
    if (!this.roomState || !this.roomState.players[playerId]) {
      return;
    }
    this.sendEventToPlayer(playerId, createPrivateStateEvent(this.roomState, playerId));
  }
  sendEventToPlayer(playerId, event) {
    const sockets = this.socketsByPlayer.get(playerId);
    if (!sockets) {
      return;
    }
    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      socket.send(payload);
    }
  }
  broadcastEvent(event) {
    const payload = JSON.stringify(event);
    for (const sockets of this.socketsByPlayer.values()) {
      for (const socket of sockets) {
        socket.send(payload);
      }
    }
  }
  sendError(socket, code, message) {
    const event = {
      type: "error",
      code,
      message
    };
    socket.send(JSON.stringify(event));
  }
  requireRoomState() {
    if (!this.roomState) {
      throw new Error("Room state has not been initialized.");
    }
    return this.roomState;
  }
  async applyTransition(playerId, result) {
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
  async persistRoomState() {
    if (!this.roomState) {
      return;
    }
    await this.durableState.storage.put(ROOM_STATE_STORAGE_KEY, this.roomState);
    await this.syncRoomAlarm();
  }
  async syncRoomAlarm() {
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
  hasLiveSockets() {
    return Array.from(this.socketsByPlayer.values()).some((sockets) => sockets.size > 0);
  }
  async expireRoomIfNeeded() {
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
  refreshAbandonmentWindow(now) {
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
};

// src/index.ts
function getRoomStub(env, roomCode) {
  const roomId = env.PSYBLR_ROOM.idFromName(normalizeRoomCode(roomCode));
  return env.PSYBLR_ROOM.get(roomId);
}
__name(getRoomStub, "getRoomStub");
async function handleCreateRoom(request, env) {
  const payload = await readJson(request);
  if (payload.type !== "create_room") {
    return errorResponse(400, "invalid_create_room", "Expected a create_room payload.");
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomCode = generateRoomCode();
    const roomStub = getRoomStub(env, roomCode);
    const response = await roomStub.fetch(`https://psyblr.room${INTERNAL_CREATE_ROOM_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        ...payload,
        roomCode
      })
    });
    if (response.status !== 409) {
      return response;
    }
  }
  return errorResponse(500, "room_code_exhausted", "Could not allocate a unique room code.");
}
__name(handleCreateRoom, "handleCreateRoom");
async function handleJoinRoom(request, env) {
  const payload = await readJson(request);
  if (payload.type !== "join_room" || typeof payload.roomCode !== "string") {
    return errorResponse(400, "invalid_join_room", "Expected a join_room payload with a room code.");
  }
  const roomCode = normalizeRoomCode(payload.roomCode);
  const roomStub = getRoomStub(env, roomCode);
  return roomStub.fetch(`https://psyblr.room${INTERNAL_JOIN_ROOM_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ...payload,
      roomCode
    })
  });
}
__name(handleJoinRoom, "handleJoinRoom");
async function handleResumeRoom(request, env) {
  const payload = await readJson(request);
  if (payload.type !== "resume_room" || typeof payload.roomCode !== "string" || typeof payload.playerId !== "string" || typeof payload.sessionToken !== "string") {
    return errorResponse(400, "invalid_resume_room", "Expected a resume_room payload with room credentials.");
  }
  const roomCode = normalizeRoomCode(payload.roomCode);
  const roomStub = getRoomStub(env, roomCode);
  return roomStub.fetch(`https://psyblr.room${INTERNAL_RESUME_ROOM_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ...payload,
      roomCode
    })
  });
}
__name(handleResumeRoom, "handleResumeRoom");
async function handleSocket(request, env, roomCode) {
  const roomStub = getRoomStub(env, roomCode);
  const requestUrl = new URL(request.url);
  const internalUrl = new URL(`https://psyblr.room${INTERNAL_SOCKET_PATH}`);
  requestUrl.searchParams.forEach((value, key) => {
    internalUrl.searchParams.set(key, value);
  });
  const upgradedRequest = new Request(internalUrl.toString(), request);
  return roomStub.fetch(upgradedRequest);
}
__name(handleSocket, "handleSocket");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && (url.pathname === `${API_PREFIX}/rooms` || url.pathname === `${API_PREFIX}/rooms/join` || url.pathname === `${API_PREFIX}/rooms/resume`)) {
      return corsPreflightResponse(request, env.CORS_ALLOWED_ORIGINS);
    }
    if (request.method === "POST" && url.pathname === `${API_PREFIX}/rooms`) {
      return applyCorsHeaders(await handleCreateRoom(request, env), request, env.CORS_ALLOWED_ORIGINS);
    }
    if (request.method === "POST" && url.pathname === `${API_PREFIX}/rooms/join`) {
      return applyCorsHeaders(await handleJoinRoom(request, env), request, env.CORS_ALLOWED_ORIGINS);
    }
    if (request.method === "POST" && url.pathname === `${API_PREFIX}/rooms/resume`) {
      return applyCorsHeaders(await handleResumeRoom(request, env), request, env.CORS_ALLOWED_ORIGINS);
    }
    const socketMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/socket$/);
    if (request.method === "GET" && socketMatch) {
      return handleSocket(request, env, socketMatch[1]);
    }
    return new Response(
      JSON.stringify({
        ok: true,
        product: "Psyblr",
        routes: {
          createRoom: "POST /api/rooms",
          joinRoom: "POST /api/rooms/join",
          resumeRoom: "POST /api/rooms/resume",
          openSocket: "GET /api/rooms/:code/socket?playerId=player1|player2&sessionToken=..."
        }
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-JaqYb9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-JaqYb9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  PsyblrRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
