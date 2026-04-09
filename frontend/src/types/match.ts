export type BoardCell = "" | "X" | "O";
export type MatchStatus = "waiting" | "playing" | "finished";

export interface MatchPlayer {
  userId: string;
  symbol: "X" | "O";
  isConnected: boolean;
}

export interface AuthoritativeMatchState {
  players: MatchPlayer[];
  board: BoardCell[];
  currentTurn: "X" | "O";
  status: MatchStatus;
  winner: "X" | "O" | null;
  moveDeadline: number | null;
  disconnectAt: Record<string, number>;
}
