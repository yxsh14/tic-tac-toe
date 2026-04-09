import {
  matchInit,
  matchJoin,
  matchJoinAttempt,
  matchLeave,
  matchLoop,
  matchSignal,
  matchTerminate,
} from "./match/ticTacToe";
import { createMatch } from "./rpc/createMatch";
import { getProfile } from "./rpc/getProfile";
import { joinMatch } from "./rpc/joinMatch";
import { matchmakerRpc } from "./rpc/matchmaker";

const RPC_CREATE_MATCH = "create_match";
const RPC_JOIN_MATCH = "join_match";
const RPC_MATCHMAKER = "matchmaker";
const RPC_GET_PROFILE = "get_profile";
const MATCH_NAME = "tic_tac_toe";

export function InitModule(
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  initializer.registerMatch(MATCH_NAME, {
    "matchInit": matchInit,
    "matchJoinAttempt": matchJoinAttempt,
    "matchJoin": matchJoin,
    "matchLeave": matchLeave,
    "matchLoop": matchLoop,
    "matchTerminate": matchTerminate,
    "matchSignal": matchSignal,
  });
  initializer.registerRpc(RPC_CREATE_MATCH, createMatch);
  initializer.registerRpc(RPC_JOIN_MATCH, joinMatch);
  initializer.registerRpc(RPC_MATCHMAKER, matchmakerRpc);
  initializer.registerRpc(RPC_GET_PROFILE, getProfile);
  logger.info("Nakama module initialized");
}
