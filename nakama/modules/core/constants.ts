import { Board, Symbol } from "./types";

export const SYMBOLS: Record<Symbol, Symbol> = {
  X: "X",
  O: "O",
};

export const BOARD_SIZE = 9;
export const MAX_PLAYERS = 2;
export const MOVE_TIMEOUT_MS = 30_000;
export const RECONNECT_TIMEOUT_MS = 5 * 60_000;

export const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const EMPTY_BOARD: Board = Array(BOARD_SIZE).fill("");
