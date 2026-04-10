export type BoardCell = "" | "X" | "O";
export type MatchStatus = "waiting" | "playing" | "waiting_reconnect" | "finished";
export type GameMode = "classic" | "timed";
export type LobbyStatusPayload = "waiting" | "playing" | "waiting_reconnect" | "finished";

/** Authoritative broadcast: no user ids (username + symbol only). */
export interface MatchPlayer {
  username: string;
  symbol: "X" | "O";
  isConnected: boolean;
}

export interface PlayerPublicStats {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface AuthoritativeMatchState {
  players: MatchPlayer[];
  board: BoardCell[];
  currentTurn: "X" | "O";
  status: MatchStatus;
  winner: "X" | "O" | null;
  movesCount: number;
  moveDeadline: number | null;
  reconnectDeadline: number | null;
  disconnectAt: Record<string, number>;
  gameMode?: GameMode;
  lobbyStatus?: LobbyStatusPayload;
  moveTimeoutMs?: number | null;
  playerPublicStats?: Record<string, PlayerPublicStats>;
  resultSummary?: {
    winnerSymbol: "X" | "O" | null;
    isDraw: boolean;
    ratingsByUsername: Record<string, number>;
  };
}
