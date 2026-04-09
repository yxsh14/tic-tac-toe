export const createMatch: nkruntime.RpcFunction = (
  _ctx,
  _logger,
  nk,
  _payload
) => {
  const matchId = nk.matchCreate("tic_tac_toe", {});

  return JSON.stringify({
    ok: true,
    data: {
      matchId,
    },
    error: null,
  });
};
