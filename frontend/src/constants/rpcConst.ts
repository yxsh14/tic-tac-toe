/**
 * Nakama RPC ids registered in `nakama/modules/runtime.ts`.
 */
export const RPC_IDS = {
  CREATE_MATCH: "create_match",
  JOIN_MATCH_BY_CODE: "join_match_by_code",
  FIND_MATCH: "find_match",
  GET_LEADERBOARD: "get_leaderboard",
  GET_PROFILE: "get_profile",
  MATCHMAKER: "matchmaker",
} as const;

/** Authoritative match module name passed to nk.matchCreate */
export const NAKAMA_MATCH_MODULE = "tic_tac_toe" as const;
