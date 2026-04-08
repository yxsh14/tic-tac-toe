import {
  BOARD_SIZE,
  EMPTY_BOARD,
  MAX_PLAYERS,
  MOVE_TIMEOUT_MS,
  RECONNECT_TIMEOUT_MS,
  SYMBOLS,
} from "../core/constants";
import { MovePayload, OPCODES } from "../core/protocol";
import { MatchState, Player } from "../core/types";
import { checkWinner, isBoardFull } from "../core/utils";

const createInitialState = (): MatchState => ({
  players: [],
  board: [...EMPTY_BOARD],
  currentTurn: SYMBOLS.X,
  status: "waiting",
  winner: null,
  moveDeadline: null,
  disconnectAt: {},
});

const updateStatus = (state: MatchState): MatchState => {
  if (state.status === "finished") return state;
  const connectedPlayers = state.players.filter((player) => player.isConnected).length;
  return {
    ...state,
    status: connectedPlayers < MAX_PLAYERS ? "waiting" : "playing",
  };
};

const getPlayerByUserId = (state: MatchState, userId: string): Player | undefined =>
  state.players.find((p) => p.userId === userId);

const assignSymbol = (state: MatchState): "X" | "O" =>
  state.players.some((p) => p.symbol === SYMBOLS.X) ? SYMBOLS.O : SYMBOLS.X;

const now = (): number => Date.now();

const getPlayerBySymbol = (state: MatchState, symbol: "X" | "O"): Player | undefined =>
  state.players.find((player) => player.symbol === symbol);

const getOpponentSymbol = (symbol: "X" | "O"): "X" | "O" =>
  symbol === SYMBOLS.X ? SYMBOLS.O : SYMBOLS.X;

const setWinner = (state: MatchState, winner: "X" | "O"): MatchState => ({
  ...state,
  winner,
  status: "finished",
  moveDeadline: null,
});

const refreshMoveDeadlineIfPlayable = (state: MatchState): MatchState => {
  if (state.status !== "playing") {
    return { ...state, moveDeadline: null };
  }
  return { ...state, moveDeadline: now() + MOVE_TIMEOUT_MS };
};

const toStateMessage = (state: MatchState) =>
  JSON.stringify({
    board: state.board,
    currentTurn: state.currentTurn,
    status: state.status,
    winner: state.winner,
    moveDeadline: state.moveDeadline,
    disconnectAt: state.disconnectAt,
    players: state.players.map((p) => ({
      userId: p.userId,
      symbol: p.symbol,
      isConnected: p.isConnected,
    })),
  });

const rejectMove = (
  logger: nkruntime.Logger,
  userId: string,
  reason: string
): void => {
  logger.debug("Move rejected userId=%s reason=%s", userId, reason);
};

const processMove = (
  state: MatchState,
  userId: string,
  payload: MovePayload,
  logger: nkruntime.Logger
): MatchState => {
  const player = getPlayerByUserId(state, userId);
  if (!player) {
    rejectMove(logger, userId, "player_not_in_match");
    return state;
  }
  if (state.status !== "playing") {
    rejectMove(logger, userId, "game_not_playing");
    return state;
  }
  if (state.winner) {
    rejectMove(logger, userId, "game_finished");
    return state;
  }
  if (state.currentTurn !== player.symbol) {
    rejectMove(logger, userId, "wrong_turn");
    return state;
  }

  const position = payload.position;
  if (!Number.isInteger(position) || position < 0 || position >= BOARD_SIZE) {
    rejectMove(logger, userId, "invalid_cell");
    return state;
  }
  if (state.board[position] !== "") {
    rejectMove(logger, userId, "cell_filled");
    return state;
  }

  const board = [...state.board];
  board[position] = player.symbol;

  const winner = checkWinner(board);
  const draw = !winner && isBoardFull(board);
  const nextTurn = player.symbol === SYMBOLS.X ? SYMBOLS.O : SYMBOLS.X;
  const movedState: MatchState = {
    ...state,
    board,
    currentTurn: winner || draw ? state.currentTurn : nextTurn,
    status: winner || draw ? "finished" : state.status,
    winner,
    moveDeadline: winner || draw ? null : state.moveDeadline,
  };
  return refreshMoveDeadlineIfPlayable(movedState);
};

const prepareGameStart = (state: MatchState): MatchState => {
  if (state.status !== "playing") return state;
  const isBoardPristine = state.board.every((cell) => cell === "");
  if (!isBoardPristine) return state;
  return {
    ...state,
    currentTurn: SYMBOLS.X,
  };
};

const processDisconnectTimeout = (state: MatchState, logger: nkruntime.Logger): MatchState => {
  if (state.status === "finished") return state;
  const current = now();

  for (const player of state.players) {
    if (player.isConnected) continue;
    const disconnectedAt = state.disconnectAt[player.userId];
    if (!disconnectedAt) continue;
    if (current - disconnectedAt < RECONNECT_TIMEOUT_MS) continue;

    const winner = getOpponentSymbol(player.symbol);
    logger.info(
      "Player %s timed out from disconnect; winner=%s",
      player.userId,
      winner
    );
    return setWinner(state, winner);
  }
  return state;
};

const processMoveTimeout = (state: MatchState, logger: nkruntime.Logger): MatchState => {
  if (state.status !== "playing" || !state.moveDeadline) return state;
  if (now() <= state.moveDeadline) return state;

  const loser = state.currentTurn;
  const winner = getOpponentSymbol(loser);
  const loserPlayer = getPlayerBySymbol(state, loser);
  logger.info("Move timer expired for %s, winner=%s", loserPlayer?.userId ?? loser, winner);
  return setWinner(state, winner);
};

export const ticTacToeMatchHandler: nkruntime.MatchHandler<MatchState> = {
  matchInit: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    _params: { [key: string]: string }
  ) => ({
    state: createInitialState(),
    tickRate: 10,
    label: "tic-tac-toe",
  }),

  matchJoinAttempt: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    presence: nkruntime.Presence,
    _metadata: { [key: string]: string }
  ) => {
    void dispatcher;
    void tick;
    const existing = getPlayerByUserId(state, presence.userId);
    if (existing) {
      return { state, accept: true };
    }
    if (state.players.length >= MAX_PLAYERS || state.status === "finished") {
      return {
        state,
        accept: false,
        rejectMessage: "Match is full",
      };
    }
    return { state, accept: true };
  },

  matchJoin: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    presences: nkruntime.Presence[]
  ) => {
    void tick;
    let nextState = state;

    for (const presence of presences) {
      const existing = getPlayerByUserId(nextState, presence.userId);
      if (existing) {
        const { [presence.userId]: _removed, ...restDisconnectAt } = nextState.disconnectAt;
        nextState = {
          ...nextState,
          players: nextState.players.map((player) =>
            player.userId === presence.userId
              ? { ...player, isConnected: true }
              : player
          ),
          disconnectAt: restDisconnectAt,
        };
        continue;
      }

      if (nextState.players.length >= MAX_PLAYERS) {
        continue;
      }

      nextState = {
        ...nextState,
        players: [
          ...nextState.players,
          {
            userId: presence.userId,
            symbol: assignSymbol(nextState),
            isConnected: true,
          },
        ],
      };
    }

    nextState = updateStatus(nextState);
    nextState = prepareGameStart(nextState);
    nextState = refreshMoveDeadlineIfPlayable(nextState);
    dispatcher.broadcastMessage(OPCODES.STATE_UPDATE, toStateMessage(nextState));
    return { state: nextState };
  },

  matchLeave: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    presences: nkruntime.Presence[]
  ) => {
    void tick;
    let nextState = state;

    for (const presence of presences) {
      nextState = {
        ...nextState,
        players: nextState.players.map((player) =>
          player.userId === presence.userId
            ? { ...player, isConnected: false }
            : player
        ),
        disconnectAt: {
          ...nextState.disconnectAt,
          [presence.userId]: now(),
        },
      };
    }

    if (nextState.status !== "finished") {
      nextState = updateStatus(nextState);
      nextState = refreshMoveDeadlineIfPlayable(nextState);
    }

    dispatcher.broadcastMessage(OPCODES.STATE_UPDATE, toStateMessage(nextState));
    return { state: nextState };
  },

  matchLoop: (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    messages: nkruntime.MatchMessage[]
  ) => {
    void ctx;
    void tick;
    let nextState = state;
    nextState = processDisconnectTimeout(nextState, logger);
    nextState = processMoveTimeout(nextState, logger);

    for (const message of messages) {
      if (nextState.status === "finished") {
        break;
      }
      if (message.opCode !== OPCODES.MOVE) {
        continue;
      }

      let payload: MovePayload;
      try {
        payload = JSON.parse(nk.binaryToString(message.data)) as MovePayload;
      } catch {
        rejectMove(logger, message.sender.userId, "invalid_payload");
        continue;
      }
      if (typeof payload.position !== "number") {
        rejectMove(logger, message.sender.userId, "missing_position");
        continue;
      }

      nextState = processMove(nextState, message.sender.userId, payload, logger);
    }

    if (nextState !== state) {
      dispatcher.broadcastMessage(OPCODES.STATE_UPDATE, toStateMessage(nextState));
    }
    return { state: nextState };
  },

  matchTerminate: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    _dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    graceSeconds: number
  ) => {
    void tick;
    void graceSeconds;
    return { state };
  },

  matchSignal: (
    _ctx: nkruntime.Context,
    _logger: nkruntime.Logger,
    _nk: nkruntime.Nakama,
    _dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: MatchState,
    data: string
  ) => {
    void tick;
    return { state, data };
  },
};
