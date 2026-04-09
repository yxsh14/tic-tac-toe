import { MAX_PLAYERS } from "../shared/constants";

interface JoinMatchPayload {
  matchId?: string;
}

export const joinMatch: nkruntime.RpcFunction = (
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
      return JSON.stringify({
        ok: false,
        data: null,
        error: "invalid payload json",
      });
    }
  }

  const matchId = request.matchId?.trim();
  if (!matchId) {
    return JSON.stringify({
      ok: false,
      data: null,
      error: "matchId is required",
    });
  }

  const matches = nk.matchList(100, true, "", 0, MAX_PLAYERS, "");
  const targetMatch = matches.find((match) => match.matchId === matchId);
  if (!targetMatch) {
    return JSON.stringify({
      ok: false,
      data: null,
      error: "match not found",
    });
  }

  const size = (targetMatch as { size?: number }).size;
  if (typeof size === "number" && size >= MAX_PLAYERS) {
    return JSON.stringify({
      ok: false,
      data: null,
      error: "match is full",
    });
  }

  return JSON.stringify({
    ok: true,
    data: {
      matchId,
    },
    error: null,
  });
};
