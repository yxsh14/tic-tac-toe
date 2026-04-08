import { WINNING_LINES } from "./constants";
import { Board, Symbol } from "./types";

export const checkWinner = (board: Board): Symbol | null => {
  for (const [a, b, c] of WINNING_LINES) {
    const cell = board[a];
    if (cell && cell === board[b] && cell === board[c]) {
      return cell;
    }
  }
  return null;
};

export const isBoardFull = (board: Board): boolean =>
  board.every((cell) => cell !== "");
