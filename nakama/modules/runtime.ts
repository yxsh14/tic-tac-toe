type Mark = "X" | "O";
type Cell = Mark | "";
type MatchStatus = "waiting" | "playing" | "finished";

interface MatchPlayer {
  userId: string;
  symbol: Mark;
  isConnected: boolean;
}

interface MatchState {
  players: MatchPlayer[];
  board: Cell[];
  currentTurn: Mark;
  status: MatchStatus;
  winner: Mark | null;
  moveDeadline: number | null;
  disconnectAt: Record<string, number>;
}

interface RpcEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const MATCH_NAME = "tic_tac_toe";
const RPC_CREATE_MATCH = "create_match";
const RPC_JOIN_MATCH = "join_match";
const RPC_MATCHMAKER = "matchmaker";
const RPC_GET_PROFILE = "get_profile";

const OP_CODE_MOVE = 1;
const OP_CODE_STATE = 2;

const MAX_PLAYERS = 2;
const BOARD_SIZE = 9;
const MOVE_TIMEOUT_MS = 30_000;
const RECONNECT_TIMEOUT_MS = 5 * 60_000;

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
    moveDeadline: null,
    disconnectAt: {},
  };
}

function getPlayerByUserId(state: MatchState, userId: string): MatchPlayer | null {
  for (let i = 0; i < state.players.length; i += 1) {
    if (state.players[i].userId === userId) return state.players[i];
  }
  return null;
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

function updateStatusAndDeadline(state: MatchState): void {
  if (state.status === "finished") {
    state.moveDeadline = null;
    return;
  }

  let connected = 0;
  for (let i = 0; i < state.players.length; i += 1) {
    if (state.players[i].isConnected) connected += 1;
  }

  state.status = connected >= MAX_PLAYERS ? "playing" : "waiting";
  state.moveDeadline = state.status === "playing" ? nowMs() + MOVE_TIMEOUT_MS : null;
}

function toStatePayload(state: MatchState): string {
  return JSON.stringify({
    players: state.players,
    board: state.board,
    currentTurn: state.currentTurn,
    status: state.status,
    winner: state.winner,
    moveDeadline: state.moveDeadline,
    disconnectAt: state.disconnectAt,
  });
}

function applyDisconnectTimeout(state: MatchState, logger: nkruntime.Logger): void {
  if (state.status === "finished") return;

  const now = nowMs();
  for (let i = 0; i < state.players.length; i += 1) {
    const player = state.players[i];
    if (player.isConnected) continue;
    const disconnectedAt = state.disconnectAt[player.userId];
    if (!disconnectedAt) continue;
    if (now - disconnectedAt < RECONNECT_TIMEOUT_MS) continue;

    state.winner = opponentSymbol(player.symbol);
    state.status = "finished";
    state.moveDeadline = null;
    logger.info("Disconnect timeout, winner=%s", state.winner);
    return;
  }
}

function applyMoveTimeout(state: MatchState, logger: nkruntime.Logger): void {
  if (state.status !== "playing") return;
  if (!state.moveDeadline) return;
  if (nowMs() <= state.moveDeadline) return;

  state.winner = opponentSymbol(state.currentTurn);
  state.status = "finished";
  state.moveDeadline = null;
  logger.info("Move timeout, winner=%s", state.winner);
}

function matchInit(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _params: { [key: string]: string }
) {
  return {
    state: createInitialState(),
    tickRate: 10,
    label: "tic-tac-toe",
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
  if (state.status === "finished" || state.players.length >= MAX_PLAYERS) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
}

function matchJoin(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
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
      symbol: symbol,
      isConnected: true,
    });
  }

  updateStatusAndDeadline(state);
  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));
  return { state: state };
}

function matchLeave(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
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

  if (state.status !== "finished") {
    updateStatusAndDeadline(state);
  }
  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));
  return { state: state };
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
  applyDisconnectTimeout(state, logger);
  applyMoveTimeout(state, logger);

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

    const winner = checkWinner(state.board);
    if (winner) {
      state.winner = winner;
      state.status = "finished";
      state.moveDeadline = null;
      continue;
    }

    if (isBoardFull(state.board)) {
      state.winner = null;
      state.status = "finished";
      state.moveDeadline = null;
      continue;
    }

    state.currentTurn = opponentSymbol(player.symbol);
    state.moveDeadline = nowMs() + MOVE_TIMEOUT_MS;
  }

  dispatcher.broadcastMessage(OP_CODE_STATE, toStatePayload(state));
  return { state: state };
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

function createMatch(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  _payload: string
) {
  const matchId = nk.matchCreate(MATCH_NAME, {});
  const response: RpcEnvelope<{ matchId: string }> = {
    ok: true,
    data: { matchId: matchId },
    error: null,
  };
  return JSON.stringify(response);
}

function joinMatch(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
) {
  let request: { matchId?: string } = {};
  if (payload) {
    try {
      request = JSON.parse(payload) as { matchId?: string };
    } catch (_err) {
      return JSON.stringify({ ok: false, data: null, error: "invalid payload json" });
    }
  }

  const matchId = request.matchId ? String(request.matchId).trim() : "";
  if (!matchId) {
    return JSON.stringify({ ok: false, data: null, error: "matchId is required" });
  }

  const matches = nk.matchList(100, true, "", 0, MAX_PLAYERS, "");
  let target: { matchId: string; size?: number } | null = null;
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i] as { matchId: string; size?: number };
    if (m.matchId === matchId) {
      target = m;
      break;
    }
  }

  if (!target) {
    return JSON.stringify({ ok: false, data: null, error: "match not found" });
  }

  if (typeof target.size === "number" && target.size >= MAX_PLAYERS) {
    return JSON.stringify({ ok: false, data: null, error: "match is full" });
  }

  return JSON.stringify({ ok: true, data: { matchId: matchId }, error: null });
}

function matchmakerRpc(
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  _payload: string
) {
  const matches = nk.matchList(10, true, "", 0, 1, "");
  if (matches.length > 0) {
    return JSON.stringify({ ok: true, mode: "found", matchId: matches[0].matchId });
  }
  const matchId = nk.matchCreate(MATCH_NAME, {});
  return JSON.stringify({ ok: true, mode: "created", matchId: matchId });
}

function getProfile(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string) {
  if (!ctx.userId) {
    return JSON.stringify({ ok: false, data: null, error: "unauthorized" });
  }
  const account = nk.accountGetId(ctx.userId);
  const username = account.user && account.user.username ? account.user.username : (ctx.username || "player");
  return JSON.stringify({ ok: true, data: { userId: ctx.userId, username: username }, error: null });
}

function InitModule(
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
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
  initializer.registerRpc(RPC_JOIN_MATCH, joinMatch);
  initializer.registerRpc(RPC_MATCHMAKER, matchmakerRpc);
  initializer.registerRpc(RPC_GET_PROFILE, getProfile);
  logger.info("Nakama module initialized");
}

(globalThis as any).matchInit = matchInit;
(globalThis as any).matchJoinAttempt = matchJoinAttempt;
(globalThis as any).matchJoin = matchJoin;
(globalThis as any).matchLeave = matchLeave;
(globalThis as any).matchLoop = matchLoop;
(globalThis as any).matchTerminate = matchTerminate;
(globalThis as any).matchSignal = matchSignal;

(globalThis as any).createMatch = createMatch;
(globalThis as any).joinMatch = joinMatch;
(globalThis as any).matchmakerRpc = matchmakerRpc;
(globalThis as any).getProfile = getProfile;
(globalThis as any).InitModule = InitModule;
