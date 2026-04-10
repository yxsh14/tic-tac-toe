type Mark = "X" | "O";
type Cell = Mark | "";
type MatchStatus = "waiting" | "playing" | "waiting_reconnect" | "finished";
type GameMode = "classic" | "timed";

interface MatchPlayer {
  userId: string;
  username: string;
  symbol: Mark;
  isConnected: boolean;
}

interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  rating: number;
}

interface PublicPlayerStats {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

interface MatchState {
  players: MatchPlayer[];
  board: Cell[];
  currentTurn: Mark;
  status: MatchStatus;
  winner: Mark | null;
  movesCount: number;
  moveDeadline: number | null;
  reconnectDeadline: number | null;
  disconnectAt: Record<string, number>;
  gameMode: GameMode;
  moveTimeoutMs: number;
  statsApplied: boolean;
  ratingsByUsername: Record<string, number> | null;
  playerPublicStats: Record<string, PublicPlayerStats>;
}

interface RpcEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const MATCH_NAME = "tic_tac_toe";
const RPC_CREATE_MATCH = "create_match";
const RPC_JOIN_MATCH_BY_CODE = "join_match_by_code";
const RPC_FIND_MATCH = "find_match";
const RPC_GET_LEADERBOARD = "get_leaderboard";
const RPC_MATCHMAKER = "matchmaker";
const RPC_GET_PROFILE = "get_profile";

const STORAGE_COLLECTION_ROOMS = "tic_tac_toe_room";
const STORAGE_PLAYER_STATS = "player_stats";
const STATS_KEY = "summary";
const LEADERBOARD_ID = "tic_tac_toe_elo";
const DEFAULT_RATING = 1200;
const ELO_K = 32;
const OP_CODE_MOVE = 1;
const OP_CODE_STATE = 2;

const MAX_PLAYERS = 2;
const BOARD_SIZE = 9;
const DEFAULT_MOVE_TIMEOUT_MS = 60_000;
const RECONNECT_TIMEOUT_MS = 3 * 60_000;
const ROOM_CODE_LEN = 6;
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function nowMs(): number {
  return Date.now();
}

function createEmptyBoard(): Cell[] {
  return ["", "", "", "", "", "", "", "", ""];
}

function createInitialState(): MatchState {
  return {
    players: [],
    board: createEmptyBoard(),
    currentTurn: "X",
    status: "waiting",
    winner: null,
    movesCount: 0,
    moveDeadline: null,
    reconnectDeadline: null,
    disconnectAt: {},
    gameMode: "classic",
    moveTimeoutMs: DEFAULT_MOVE_TIMEOUT_MS,
    statsApplied: false,
    ratingsByUsername: null,
    playerPublicStats: {},
  };
}

function parseGameMode(raw: string | undefined): GameMode {
  return raw === "timed" ? "timed" : "classic";
}

function parseMoveTimeoutMsParam(raw: string | undefined): number {
  if (raw === "30000") return 30000;
  if (raw === "60000") return 60000;
  return DEFAULT_MOVE_TIMEOUT_MS;
}

function parseMoveTimeoutSecFromPayload(moveTimeoutSec: unknown): number {
  const n = Number(moveTimeoutSec);
  if (n === 30) return 30000;
  if (n === 60) return 60000;
  return DEFAULT_MOVE_TIMEOUT_MS;
}

function setPlayingMoveDeadline(state: MatchState): void {
  if (state.gameMode === "timed" && state.status === "playing") {
    state.moveDeadline = nowMs() + state.moveTimeoutMs;
  } else {
    state.moveDeadline = null;
  }
}

function refreshPublicPlayerStats(state: MatchState, nk: nkruntime.Nakama): void {
  const next: Record<string, PublicPlayerStats> = {};
  for (let i = 0; i < state.players.length; i += 1) {
    const p = state.players[i];
    const s = getStats(nk, p.userId);
    next[p.username] = {
      rating: s.rating,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
    };
  }
  state.playerPublicStats = next;
}

function getStats(nk: nkruntime.Nakama, userId: string): PlayerStats {
  const defaults: PlayerStats = {
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    rating: DEFAULT_RATING,
  };
  const res = nk.storageRead([
    { collection: STORAGE_PLAYER_STATS, key: STATS_KEY, userId: userId },
  ]);
  if (!res || res.length === 0 || !res[0].value) return defaults;
  try {
    const parsed = JSON.parse(res[0].value) as Partial<PlayerStats>;
    return {
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      draws: Number(parsed.draws) || 0,
      totalGames: Number(parsed.totalGames) || 0,
      rating: typeof parsed.rating === "number" && !isNaN(parsed.rating) ? parsed.rating : DEFAULT_RATING,
    };
  } catch (_e) {
    return defaults;
  }
}

function updateStats(
  nk: nkruntime.Nakama,
  userId: string,
  username: string,
  stats: PlayerStats,
  logger: nkruntime.Logger
): void {
  try {
    nk.storageWrite([
      {
        collection: STORAGE_PLAYER_STATS,
        key: STATS_KEY,
        userId: userId,
        value: JSON.stringify(stats),
        permissionRead: 1,
        permissionWrite: 0,
        version: "",
      },
    ]);
    nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, username || "player", stats.rating, 0, {});
  } catch (e) {
    logger.error("updateStats failed for %s: %s", userId, String(e));
    throw e;
  }
}

function calculateElo(rSelf: number, rOpp: number, scoreSelf: number): number {
  const expected = 1 / (1 + Math.pow(10, (rOpp - rSelf) / 400));
  return Math.round(rSelf + ELO_K * (scoreSelf - expected));
}

function updateEloWinLoss(
  nk: nkruntime.Nakama,
  winner: MatchPlayer,
  loser: MatchPlayer,
  logger: nkruntime.Logger
): void {
  const sW = getStats(nk, winner.userId);
  const sL = getStats(nk, loser.userId);
  const newRw = calculateElo(sW.rating, sL.rating, 1);
  const newRl = calculateElo(sL.rating, sW.rating, 0);
  sW.wins += 1;
  sW.totalGames += 1;
  sW.rating = newRw;
  sL.losses += 1;
  sL.totalGames += 1;
  sL.rating = newRl;
  updateStats(nk, winner.userId, winner.username, sW, logger);
  updateStats(nk, loser.userId, loser.username, sL, logger);
}

function updateEloDraw(nk: nkruntime.Nakama, a: MatchPlayer, b: MatchPlayer, logger: nkruntime.Logger): void {
  const sA = getStats(nk, a.userId);
  const sB = getStats(nk, b.userId);
  const newRa = calculateElo(sA.rating, sB.rating, 0.5);
  const newRb = calculateElo(sB.rating, sA.rating, 0.5);
  sA.draws += 1;
  sA.totalGames += 1;
  sA.rating = newRa;
  sB.draws += 1;
  sB.totalGames += 1;
  sB.rating = newRb;
  updateStats(nk, a.userId, a.username, sA, logger);
  updateStats(nk, b.userId, b.username, sB, logger);
}

function maybeApplyMatchEndStats(state: MatchState, nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  if (state.statsApplied) return;
  if (state.status !== "finished") return;
  if (state.players.length !== 2) return;

  state.statsApplied = true;
  try {
    const a = state.players[0];
    const b = state.players[1];
    if (state.winner === null) {
      updateEloDraw(nk, a, b, logger);
    } else if (state.winner === a.symbol) {
      updateEloWinLoss(nk, a, b, logger);
    } else {
      updateEloWinLoss(nk, b, a, logger);
    }
    state.ratingsByUsername = {};
    state.ratingsByUsername[a.username] = getStats(nk, a.userId).rating;
    state.ratingsByUsername[b.username] = getStats(nk, b.userId).rating;
  } catch (e) {
    logger.error("match end stats failed: %s", String(e));
    state.statsApplied = false;
    state.ratingsByUsername = null;
  }
}

function lobbyStatusForPayload(state: MatchState): string {
  if (state.status === "finished") return "finished";
  if (state.status === "waiting_reconnect") return "waiting_reconnect";
  if (state.status === "playing") return "playing";
  return "waiting";
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LEN; i += 1) {
    out += ROOM_CODE_CHARS.charAt(randomInt(ROOM_CODE_CHARS.length));
  }
  return out;
}

function normalizeRoomCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function roomAlreadyUsed(nk: nkruntime.Nakama, roomCode: string): boolean {
  // CRITICAL FIX: Check if there's an ACTIVE match with this room code
  // Finished/terminated matches should not block room code reuse
  const matches = nk.matchList(10, true, roomCode, 0, MAX_PLAYERS + 1, "");
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i] as { matchId?: string; label?: string };
    if (!m.label) continue;
    try {
      const parsed = JSON.parse(m.label) as { status?: string };
      // Only count as "used" if match is NOT finished
      if (parsed.status !== "finished") {
        return true;
      }
    } catch {
      // If can't parse label, assume it's an old format match - count as used to be safe
      return true;
    }
  }
  return false;
}

function persistRoomMapping(
  nk: nkruntime.Nakama,
  ctx: nkruntime.Context,
  roomCode: string,
  matchId: string
): void {
  if (!ctx.userId) return;
  nk.storageWrite([
    {
      collection: STORAGE_COLLECTION_ROOMS,
      key: roomCode,
      userId: ctx.userId,
      value: JSON.stringify({ matchId: matchId, roomCode: roomCode, createdAt: Date.now() }),
      permissionRead: 2,
      permissionWrite: 0,
      version: "",
    },
  ]);
}

function findMatchIdByRoomCode(nk: nkruntime.Nakama, roomCode: string): string | null {
  const matches = nk.matchList(10, true, roomCode, 0, MAX_PLAYERS + 1, "");
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i] as { matchId?: string; label?: string };
    if (!m.matchId) continue;
    // Skip finished matches
    if (m.label) {
      try {
        const parsed = JSON.parse(m.label) as { status?: string };
        if (parsed.status === "finished") continue;
      } catch {
        // If can't parse, assume active to be safe
      }
    }
    return m.matchId;
  }
  return null;
}

function getPlayerByUserId(state: MatchState, userId: string): MatchPlayer | null {
  for (let i = 0; i < state.players.length; i += 1) {
    if (state.players[i].userId === userId) return state.players[i];
  }
  return null;
}

function countConnected(state: MatchState): number {
  let n = 0;
  for (let i = 0; i < state.players.length; i += 1) {
    if (state.players[i].isConnected) n += 1;
  }
  return n;
}

function opponentSymbol(symbol: Mark): Mark {
  return symbol === "X" ? "O" : "X";
}

function checkWinner(board: Cell[]): Mark | null {
  for (let i = 0; i < WINNING_LINES.length; i += 1) {
    const line = WINNING_LINES[i];
    const a = line[0];
    const b = line[1];
    const c = line[2];
    const cell = board[a];
    if (cell !== "" && cell === board[b] && cell === board[c]) {
      return cell;
    }
  }
  return null;
}

function isBoardFull(board: Cell[]): boolean {
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === "") return false;
  }
  return true;
}

function publicDisconnectAt(state: MatchState): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = Object.keys(state.disconnectAt);
  for (let i = 0; i < keys.length; i += 1) {
    const uid = keys[i];
    const p = getPlayerByUserId(state, uid);
    if (p && p.username) {
      out[p.username] = state.disconnectAt[uid];
    }
  }
  return out;
}

function toStatePayload(state: MatchState): string {
  const publicPlayers: { username: string; symbol: Mark; isConnected: boolean }[] = [];
  for (let i = 0; i < state.players.length; i += 1) {
    publicPlayers.push({
      username: state.players[i].username,
      symbol: state.players[i].symbol,
      isConnected: state.players[i].isConnected,
    });
  }

  const payload: Record<string, unknown> = {
    players: publicPlayers,
    board: state.board,
    currentTurn: state.currentTurn,
    status: state.status,
    winner: state.winner,
    movesCount: state.movesCount,
    moveDeadline: state.moveDeadline,
    reconnectDeadline: state.reconnectDeadline,
    disconnectAt: publicDisconnectAt(state),
    gameMode: state.gameMode,
    lobbyStatus: lobbyStatusForPayload(state),
    moveTimeoutMs: state.gameMode === "timed" ? state.moveTimeoutMs : null,
    playerPublicStats: state.playerPublicStats,
  };

  if (state.status === "finished" && state.ratingsByUsername) {
    payload.resultSummary = {
      winnerSymbol: state.winner,
      isDraw: state.winner === null,
      ratingsByUsername: state.ratingsByUsername,
    };
  }

  return JSON.stringify(payload);
}

function countConnectedPlayers(state: MatchState): number {
  let count = 0;
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].isConnected) count += 1;
  }
  return count;
}

function buildMatchLabel(state: MatchState, roomCode: string, mode: GameMode, isInvite: boolean): string {
  const connected = countConnectedPlayers(state);
  const payload = {
    status: state.status,
    connectedPlayers: connected,
    roomCode: roomCode,
    mode: mode,
    isInvite: isInvite,
    // REFINED: Only matches with exactly 1 connected player are open for joining
    // This prevents reuse of abandoned matches (0 players) or full matches (2 players)
    isOpen: state.status === "waiting" && connected === 1,
  };
  return JSON.stringify(payload);
}

function syncStateAfterPresenceChange(state: MatchState): void {
  if (state.status === "finished") {
    state.moveDeadline = null;
    state.reconnectDeadline = null;
    return;
  }

  const connected = countConnected(state);

  if (state.movesCount === 0) {
    state.reconnectDeadline = null;
    if (connected >= MAX_PLAYERS) {
      state.status = "playing";
      setPlayingMoveDeadline(state);
    } else {
      state.status = "waiting";
      state.moveDeadline = null;
    }
    return;
  }

  if (connected >= MAX_PLAYERS) {
    state.status = "playing";
    state.reconnectDeadline = null;
    if (!state.moveDeadline) {
      setPlayingMoveDeadline(state);
    }
    return;
  }

  state.status = "waiting_reconnect";
  state.moveDeadline = null;
  if (!state.reconnectDeadline) {
    state.reconnectDeadline = nowMs() + RECONNECT_TIMEOUT_MS;
  }
}

function applyReconnectTimeout(state: MatchState, logger: nkruntime.Logger): void {
  if (state.status !== "waiting_reconnect") return;
  if (!state.reconnectDeadline) return;
  if (nowMs() <= state.reconnectDeadline) return;

  for (let i = 0; i < state.players.length; i += 1) {
    const p = state.players[i];
    if (!p.isConnected) {
      state.winner = opponentSymbol(p.symbol);
      state.status = "finished";
      state.moveDeadline = null;
      state.reconnectDeadline = null;
      logger.info("Reconnect timeout, winner=%s", state.winner);
      return;
    }
  }

  state.status = "finished";
  state.winner = null;
  state.moveDeadline = null;
  state.reconnectDeadline = null;
  logger.info("Reconnect timeout draw");
}

function applyMoveTimeout(state: MatchState, logger: nkruntime.Logger): void {
  if (state.gameMode !== "timed") return;
  if (state.status !== "playing") return;
  if (!state.moveDeadline) return;
  if (nowMs() <= state.moveDeadline) return;

  state.winner = opponentSymbol(state.currentTurn);
  state.status = "finished";
  state.moveDeadline = null;
  state.reconnectDeadline = null;
  logger.info("Move timeout, winner=%s", state.winner);
}

function matchInit(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  params: { [key: string]: string }
) {
  const roomCode = params.roomCode ? params.roomCode : "";
  const mode = parseGameMode(params.mode);
  const isInvite = params.invite === "1";
  const st = createInitialState();
  st.gameMode = mode;
  st.moveTimeoutMs = parseMoveTimeoutMsParam(params.moveTimeoutMs);
  // Store metadata in state for label updates and timeouts
  const stAny = st as unknown as Record<string, unknown>;
  stAny._meta = {
    roomCode: roomCode,
    mode: mode,
    isInvite: isInvite,
  };
  stAny._createdAt = nowMs(); // For idle timeout tracking
  const label = buildMatchLabel(st, roomCode, mode, isInvite);
  return {
    state: st,
    tickRate: 10,
    label: label,
  };
}

function matchJoinAttempt(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  presence: nkruntime.Presence,
  _metadata: { [key: string]: string }
) {
  const existing = getPlayerByUserId(state, presence.userId);
  if (existing) {
    return { state: state, accept: true };
  }

  if (state.status === "finished") {
    return { state: state, accept: false, rejectMessage: "Match ended" };
  }

  const connectedPlayers = countConnectedPlayers(state);

  // Only allow join if exactly 1 connected player and match is waiting
  if (connectedPlayers >= MAX_PLAYERS) {
    return { state: state, accept: false, rejectMessage: "Room is full" };
  }

  if (state.status !== "waiting") {
    return { state: state, accept: false, rejectMessage: "Game already in progress" };
  }

  return { state: state, accept: true };
}

function matchJoin(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
) {
  for (let i = 0; i < presences.length; i += 1) {
    const presence = presences[i];
    const existing = getPlayerByUserId(state, presence.userId);
    if (existing) {
      existing.isConnected = true;
      existing.username = presence.username || existing.username;
      delete state.disconnectAt[presence.userId];
      continue;
    }

    if (state.players.length >= MAX_PLAYERS) continue;

    let symbol: Mark = "X";
    for (let j = 0; j < state.players.length; j += 1) {
      if (state.players[j].symbol === "X") {
        symbol = "O";
        break;
      }
    }

    state.players.push({
      userId: presence.userId,
      username: presence.username || "player",
      symbol: symbol,
      isConnected: true,
    });
  }

  syncStateAfterPresenceChange(state);
  refreshPublicPlayerStats(state, nk);
  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));

  // Update label with new state
  const meta = (state as unknown as Record<string, unknown>)._meta as
    | { roomCode: string; mode: GameMode; isInvite: boolean }
    | undefined;
  const label = meta
    ? buildMatchLabel(state, meta.roomCode, meta.mode, meta.isInvite)
    : JSON.stringify({ status: state.status, connectedPlayers: countConnectedPlayers(state) });

  return { state: state, label: label };
}

function matchLeave(
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
) {
  for (let i = 0; i < presences.length; i += 1) {
    const presence = presences[i];
    const player = getPlayerByUserId(state, presence.userId);
    if (!player) continue;
    player.isConnected = false;
    state.disconnectAt[presence.userId] = nowMs();
  }

  const connectedPlayers = countConnectedPlayers(state);

  // CRITICAL: Auto-cleanup empty waiting matches
  if (state.status === "waiting" && connectedPlayers === 0 && state.movesCount === 0) {
    logger.info("Auto-terminating empty waiting match");
    state.status = "finished";
    // Build updated label to signal match is closed
    const meta = (state as unknown as Record<string, unknown>)._meta as
      | { roomCode: string; mode: GameMode; isInvite: boolean }
      | undefined;
    const label = meta
      ? buildMatchLabel(state, meta.roomCode, meta.mode, meta.isInvite)
      : JSON.stringify({ status: "finished", connectedPlayers: 0 });
    return { state: state, label: label };
  }

  if (state.status !== "finished") {
    if (state.movesCount === 0) {
      state.reconnectDeadline = null;
      if (connectedPlayers >= MAX_PLAYERS) {
        state.status = "playing";
        setPlayingMoveDeadline(state);
      } else {
        state.status = "waiting";
        state.moveDeadline = null;
      }
    } else {
      if (connectedPlayers >= MAX_PLAYERS) {
        state.status = "playing";
        state.reconnectDeadline = null;
        if (!state.moveDeadline) {
          setPlayingMoveDeadline(state);
        }
      } else {
        state.status = "waiting_reconnect";
        state.moveDeadline = null;
        state.reconnectDeadline = nowMs() + RECONNECT_TIMEOUT_MS;
      }
    }
  }

  refreshPublicPlayerStats(state, nk);
  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));

  // Update label with new state
  const meta = (state as unknown as Record<string, unknown>)._meta as
    | { roomCode: string; mode: GameMode; isInvite: boolean }
    | undefined;
  const label = meta
    ? buildMatchLabel(state, meta.roomCode, meta.mode, meta.isInvite)
    : JSON.stringify({ status: state.status, connectedPlayers: countConnectedPlayers(state) });

  return { state: state, label: label };
}

const WAITING_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function applyWaitingIdleTimeout(state: MatchState, logger: nkruntime.Logger): void {
  // Auto-close waiting matches that have been idle too long
  if (state.status !== "waiting") return;
  if (state.movesCount > 0) return;

  const connected = countConnectedPlayers(state);
  if (connected === 0) return; // Already handled by matchLeave

  // Check if we've been waiting too long with 1 player
  if (connected === 1 && state.players.length === 1) {
    const now = nowMs();
    const playerJoinedAt = state.disconnectAt[state.players[0].userId];
    // Use player join time or current time - 5 min as threshold
    const threshold = now - WAITING_IDLE_TIMEOUT_MS;
    // Simple heuristic: if no activity and single player for 5+ min, close it
    // Store join time in state if not present
    const stateAny = state as unknown as Record<string, unknown>;
    if (!stateAny._createdAt) {
      stateAny._createdAt = now;
    }
    const createdAt = stateAny._createdAt as number;
    if (now - createdAt > WAITING_IDLE_TIMEOUT_MS) {
      logger.info("Auto-closing idle waiting match (created %s ms ago)", now - createdAt);
      state.status = "finished";
      state.moveDeadline = null;
      state.reconnectDeadline = null;
    }
  }
}

function matchLoop(
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  messages: nkruntime.MatchMessage[]
) {
  applyReconnectTimeout(state, logger);
  applyMoveTimeout(state, logger);
  applyWaitingIdleTimeout(state, logger);

  for (let i = 0; i < messages.length; i += 1) {
    if (state.status === "finished") break;
    const message = messages[i];
    if (message.opCode !== OP_CODE_MOVE) continue;

    let payload: { position?: number } = {};
    try {
      payload = JSON.parse(nk.binaryToString(message.data)) as { position?: number };
    } catch (_err) {
      continue;
    }

    const player = getPlayerByUserId(state, message.sender.userId);
    if (!player) continue;
    if (state.status !== "playing") continue;
    if (state.currentTurn !== player.symbol) continue;

    const position = payload.position;
    if (typeof position !== "number") continue;
    if (position < 0 || position >= BOARD_SIZE) continue;
    if (state.board[position] !== "") continue;

    state.board[position] = player.symbol;
    state.movesCount += 1;

    const winner = checkWinner(state.board);
    if (winner) {
      state.winner = winner;
      state.status = "finished";
      state.moveDeadline = null;
      state.reconnectDeadline = null;
      continue;
    }

    if (isBoardFull(state.board)) {
      state.winner = null;
      state.status = "finished";
      state.moveDeadline = null;
      state.reconnectDeadline = null;
      continue;
    }

    state.currentTurn = opponentSymbol(player.symbol);
    setPlayingMoveDeadline(state);
  }

  maybeApplyMatchEndStats(state, nk, logger);
  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));

  // Update label when state changes
  const meta = (state as unknown as Record<string, unknown>)._meta as
    | { roomCode: string; mode: GameMode; isInvite: boolean }
    | undefined;
  const label = meta
    ? buildMatchLabel(state, meta.roomCode, meta.mode, meta.isInvite)
    : JSON.stringify({ status: state.status, connectedPlayers: countConnectedPlayers(state) });

  return { state: state, label: label };
}

function matchTerminate(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  _graceSeconds: number
) {
  return { state: state };
}

function matchSignal(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: MatchState,
  data: string
) {
  return { state: state, data: data };
}

function createMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string) {
  if (!ctx.userId) {
    return JSON.stringify({ ok: false, data: null, error: "unauthorized" });
  }

  let roomCode = "";
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = generateRoomCode();
    if (roomAlreadyUsed(nk, candidate)) continue;
    roomCode = candidate;
    break;
  }

  if (!roomCode) {
    return JSON.stringify({ ok: false, data: null, error: "could not allocate room code" });
  }

  let mode: GameMode = "classic";
  let moveTimeoutMs = DEFAULT_MOVE_TIMEOUT_MS;
  if (_payload) {
    try {
      const p = JSON.parse(_payload) as { mode?: string; moveTimeoutSec?: number };
      mode = parseGameMode(p.mode);
      moveTimeoutMs = parseMoveTimeoutSecFromPayload(p.moveTimeoutSec);
    } catch (_e) {
      /* ignore */
    }
  }

  const matchId = nk.matchCreate(MATCH_NAME, {
    roomCode: roomCode,
    mode: mode,
    invite: "1",
    moveTimeoutMs: String(moveTimeoutMs),
  });
  try {
    persistRoomMapping(nk, ctx, roomCode, matchId);
  } catch (e) {
    logger.warn("room storage write failed: %s", String(e));
  }

  const response: RpcEnvelope<{ roomCode: string; matchId: string; mode: GameMode; moveTimeoutMs: number }> = {
    ok: true,
    data: { roomCode: roomCode, matchId: matchId, mode: mode, moveTimeoutMs: moveTimeoutMs },
    error: null,
  };
  return JSON.stringify(response);
}

function joinMatchByCode(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
  if (!ctx.userId) {
    return JSON.stringify({ ok: false, data: null, error: "unauthorized" });
  }

  let request: { roomCode?: string } = {};
  if (payload) {
    try {
      request = JSON.parse(payload) as { roomCode?: string };
    } catch (_err) {
      return JSON.stringify({ ok: false, data: null, error: "invalid payload json" });
    }
  }

  const raw = request.roomCode ? String(request.roomCode) : "";
  const roomCode = normalizeRoomCode(raw);
  if (roomCode.length !== ROOM_CODE_LEN) {
    return JSON.stringify({ ok: false, data: null, error: "invalid room code" });
  }

  const matchId = findMatchIdByRoomCode(nk, roomCode);
  if (!matchId) {
    return JSON.stringify({ ok: false, data: null, error: "room not found" });
  }

  const matches = nk.matchList(20, true, roomCode, 0, MAX_PLAYERS + 1, "");
  let target: { matchId: string; size?: number } | null = null;
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i] as { matchId: string; size?: number };
    if (m.matchId === matchId) {
      target = m;
      break;
    }
  }

  if (!target && matches.length > 0) {
    target = matches[0] as { matchId: string; size?: number };
  }

  if (!target) {
    return JSON.stringify({ ok: false, data: null, error: "room not found" });
  }

  if (typeof target.size === "number" && target.size >= MAX_PLAYERS) {
    return JSON.stringify({ ok: false, data: null, error: "room is full" });
  }

  return JSON.stringify({
    ok: true,
    data: { matchId: target.matchId, roomCode: roomCode },
    error: null,
  });
}

function findMatchRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
  if (!ctx.userId) {
    return JSON.stringify({ ok: false, data: null, error: "unauthorized" });
  }

  let mode: GameMode = "classic";
  let moveTimeoutMs = DEFAULT_MOVE_TIMEOUT_MS;
  if (payload) {
    try {
      const p = JSON.parse(payload) as { mode?: string; moveTimeoutSec?: number };
      mode = parseGameMode(p.mode);
      moveTimeoutMs = parseMoveTimeoutSecFromPayload(p.moveTimeoutSec);
    } catch (_e) {
      /* ignore */
    }
  }

  // CRITICAL FIX: Use wider query range and filter by parsing JSON labels
  // This avoids the bug where disconnected players count toward matchList size
  const label = "mm_" + mode;
  const allMatches = nk.matchList(50, true, label, 0, 2, "");

  // Find first match with exactly 1 connected player and waiting status
  let openMatch: { matchId: string; label?: string } | null = null;
  for (let i = 0; i < allMatches.length; i += 1) {
    const m = allMatches[i] as { matchId: string; label?: string };
    if (!m.label) continue;
    try {
      const parsed = JSON.parse(m.label) as {
        status?: string;
        connectedPlayers?: number;
        isOpen?: boolean;
      };
      // CRITICAL: Only join if match is marked as open
      // (status=waiting and has 0 or 1 connected players)
      if (parsed.isOpen === true) {
        openMatch = m;
        break;
      }
    } catch (_e) {
      // Skip matches with invalid JSON labels
      continue;
    }
  }

  if (openMatch) {
    logger.info("Found open match for quick play: %s", openMatch.matchId);
    return JSON.stringify({
      ok: true,
      data: { matchId: openMatch.matchId, mode: mode, created: false, roomCode: null },
      error: null,
    });
  }

  // No open match found - create a new one
  logger.info("No open match found, creating new match for quick play");
  let roomCode = "";
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = generateRoomCode();
    if (roomAlreadyUsed(nk, candidate)) continue;
    roomCode = candidate;
    break;
  }
  if (!roomCode) {
    return JSON.stringify({ ok: false, data: null, error: "could not allocate room code" });
  }

  const matchId = nk.matchCreate(MATCH_NAME, {
    roomCode: roomCode,
    mode: mode,
    invite: "0",
    moveTimeoutMs: String(moveTimeoutMs),
  });
  return JSON.stringify({
    ok: true,
    data: { matchId: matchId, mode: mode, roomCode: roomCode, created: true },
    error: null,
  });
}

function matchmakerRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
) {
  return findMatchRpc(ctx, logger, nk, payload);
}

function getLeaderboardRpc(_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string) {
  try {
    const list = nk.leaderboardRecordsList(LEADERBOARD_ID, [], 10);
    const recs = list.records ? list.records : [];
    const entries: {
      username: string;
      rating: number;
      wins: number;
      losses: number;
      draws: number;
      rank: number;
    }[] = [];
    for (let i = 0; i < recs.length; i += 1) {
      const r = recs[i];
      const ownerId = r.ownerId || r.owner_id || "";
      const st = ownerId ? getStats(nk, ownerId) : null;
      entries.push({
        username: r.username ? r.username : "player",
        rating: Number(r.score),
        wins: st ? st.wins : 0,
        losses: st ? st.losses : 0,
        draws: st ? st.draws : 0,
        rank: i + 1,
      });
    }
    return JSON.stringify({ ok: true, data: { entries: entries }, error: null });
  } catch (e) {
    logger.error("get_leaderboard failed: %s", String(e));
    return JSON.stringify({ ok: false, data: null, error: String(e) });
  }
}

function getProfile(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string) {
  if (!ctx.userId) {
    return JSON.stringify({ ok: false, data: null, error: "unauthorized" });
  }
  const account = nk.accountGetId(ctx.userId);
  const username =
    account.user && account.user.username ? account.user.username : ctx.username || "player";
  return JSON.stringify({ ok: true, data: { userId: ctx.userId, username: username }, error: null });
}

function InitModule(
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, true, "desc", "set", "", {});
  } catch (e) {
    logger.info("leaderboard create skipped or exists: %s", String(e));
  }

  initializer.registerMatch(MATCH_NAME, {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  initializer.registerRpc(RPC_CREATE_MATCH, createMatch);
  initializer.registerRpc(RPC_JOIN_MATCH_BY_CODE, joinMatchByCode);
  initializer.registerRpc(RPC_FIND_MATCH, findMatchRpc);
  initializer.registerRpc(RPC_GET_LEADERBOARD, getLeaderboardRpc);
  initializer.registerRpc(RPC_MATCHMAKER, matchmakerRpc);
  initializer.registerRpc(RPC_GET_PROFILE, getProfile);
  logger.info("Nakama module initialized");
}

(globalThis as unknown as Record<string, unknown>).matchInit = matchInit;
(globalThis as unknown as Record<string, unknown>).matchJoinAttempt = matchJoinAttempt;
(globalThis as unknown as Record<string, unknown>).matchJoin = matchJoin;
(globalThis as unknown as Record<string, unknown>).matchLeave = matchLeave;
(globalThis as unknown as Record<string, unknown>).matchLoop = matchLoop;
(globalThis as unknown as Record<string, unknown>).matchTerminate = matchTerminate;
(globalThis as unknown as Record<string, unknown>).matchSignal = matchSignal;

(globalThis as unknown as Record<string, unknown>).createMatch = createMatch;
(globalThis as unknown as Record<string, unknown>).joinMatchByCode = joinMatchByCode;
(globalThis as unknown as Record<string, unknown>).findMatchRpc = findMatchRpc;
(globalThis as unknown as Record<string, unknown>).getLeaderboardRpc = getLeaderboardRpc;
(globalThis as unknown as Record<string, unknown>).matchmakerRpc = matchmakerRpc;
(globalThis as unknown as Record<string, unknown>).getProfile = getProfile;
(globalThis as unknown as Record<string, unknown>).InitModule = InitModule;
