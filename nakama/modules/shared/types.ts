export type Symbol = "X" | "O";
export type Cell = Symbol | "";
export type Board = Cell[];

export interface Player {
  userId: string;
  symbol: Symbol;
  isConnected: boolean;
}

export interface MatchState {
  players: Player[];
  board: Board;
  currentTurn: Symbol;
  status: "waiting" | "playing" | "finished";
  winner: Symbol | null;
  moveDeadline: number | null;
  disconnectAt: Record<string, number>;
}
