/** Mirrors Nakama RPC JSON shape from `createMatch` / `joinMatch` runtime modules. */
export type RpcEnvelope<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

export type CreateMatchData = {
  matchId: string;
};

export type JoinMatchData = {
  matchId: string;
};

export type CreateMatchResult = RpcEnvelope<CreateMatchData>;
export type JoinMatchResult = RpcEnvelope<JoinMatchData>;
