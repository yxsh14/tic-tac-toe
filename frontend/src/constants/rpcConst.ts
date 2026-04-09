/**
 * Nakama RPC ids registered in `nakama/modules/index.ts`.
 */
export const RPC_IDS = {
  CREATE_MATCH: "create_match",
  JOIN_MATCH: "join_match",
  MATCHMAKER: "matchmaker",
  /** TODO: implement in Nakama — email signup (username + email + password). */
  SIGNUP_EMAIL: "signup_email",
  /** TODO: implement in Nakama — email login (or use Nakama built-in email auth). */
  LOGIN_EMAIL: "login_email",
} as const;

/** Authoritative match module name passed to nk.matchCreate */
export const NAKAMA_MATCH_MODULE = "tic_tac_toe" as const;
