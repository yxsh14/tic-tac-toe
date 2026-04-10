/** Mirrors Nakama RPC JSON shape from `createMatch` / `joinMatch` runtime modules. */
export type RpcEnvelope<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

export type CreateMatchData = {
  matchId: string;
  roomCode: string;
  mode?: "classic" | "timed";
  moveTimeoutMs?: number;
};

export type JoinMatchData = {
  matchId: string;
  roomCode: string;
};

export type FindMatchData = {
  matchId: string;
  mode: "classic" | "timed";
  created: boolean;
  roomCode: string | null;
};

export type LeaderboardEntry = {
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
};

export type LeaderboardData = {
  entries: LeaderboardEntry[];
};

export type CreateMatchResult = RpcEnvelope<CreateMatchData>;
export type JoinMatchResult = RpcEnvelope<JoinMatchData>;
export type FindMatchResult = RpcEnvelope<FindMatchData>;
export type GetLeaderboardResult = RpcEnvelope<LeaderboardData>;
