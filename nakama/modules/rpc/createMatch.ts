export const createMatchRpc: nkruntime.RpcFunction = (
  _ctx,
  _logger,
  nk,
  _payload
) => {
  const matchId = nk.matchCreate("tic_tac_toe", {});

  return JSON.stringify({
    ok: true,
    matchId,
    message: "match created",
  });
};
