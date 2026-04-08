interface MatchmakerPayload {
  createIfNone?: boolean;
}

export const matchmakerRpc: nkruntime.RpcFunction = (
  _ctx,
  _logger,
  nk,
  payload
) => {
  let request: MatchmakerPayload = {};

  if (payload) {
    try {
      request = JSON.parse(payload) as MatchmakerPayload;
    } catch {
      throw new Error("Invalid payload JSON");
    }
  }

  const matches = nk.matchList(10, true, "", 0, 1, "");
  if (matches.length > 0) {
    return JSON.stringify({
      ok: true,
      mode: "found",
      matchId: matches[0].matchId,
    });
  }

  if (request.createIfNone === false) {
    return JSON.stringify({
      ok: false,
      mode: "none_available",
    });
  }

  const matchId = nk.matchCreate("tic_tac_toe", {});
  return JSON.stringify({
    ok: true,
    mode: "created",
    matchId,
  });
};
