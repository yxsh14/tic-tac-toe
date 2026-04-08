import { ticTacToeMatchHandler } from "./match/tic_tac_toe";
import { createMatchRpc } from "./rpc/createMatch";
import { joinMatchRpc } from "./rpc/joinMatch";
import { matchmakerRpc } from "./rpc/matchmaker";

const RPC_CREATE_MATCH = "create_match";
const RPC_JOIN_MATCH = "join_match";
const RPC_MATCHMAKER = "matchmaker";
const MATCH_NAME = "tic_tac_toe";

const InitModule: nkruntime.InitModule = (
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) => {
  initializer.registerMatch(MATCH_NAME, ticTacToeMatchHandler);
  initializer.registerRpc(RPC_CREATE_MATCH, createMatchRpc);
  initializer.registerRpc(RPC_JOIN_MATCH, joinMatchRpc);
  initializer.registerRpc(RPC_MATCHMAKER, matchmakerRpc);
  logger.info("Nakama module initialized");
};

export { InitModule };
