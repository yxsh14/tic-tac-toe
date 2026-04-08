interface JoinMatchPayload {
  matchId?: string;
}

export const joinMatchRpc: nkruntime.RpcFunction = (
  _ctx,
  _logger,
  nk,
  payload
) => {
  let request: JoinMatchPayload = {};

  if (payload) {
    try {
      request = JSON.parse(payload) as JoinMatchPayload;
    } catch {
      throw new Error("Invalid payload JSON");
    }
  }

  const matchId = request.matchId?.trim();
  if (!matchId) {
    return JSON.stringify({
      ok: false,
      error: "matchId is required",
    });
  }

  const matches = nk.matchList(100, true, "", 0, 2, "");
  const exists = matches.some((match) => match.matchId === matchId);
  if (!exists) {
    return JSON.stringify({
      ok: false,
      error: "match not found",
    });
  }

  return JSON.stringify({
    ok: true,
    matchId,
    message: "match exists",
  });
};
