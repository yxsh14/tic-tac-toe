export const getProfile: nkruntime.RpcFunction = (ctx, _logger, nk, _payload) => {
  if (!ctx.userId) {
    return JSON.stringify({
      ok: false,
      data: null,
      error: "unauthorized",
    });
  }

  const account = nk.accountGetId(ctx.userId);
  const username = account.user?.username ?? ctx.username ?? "player";

  return JSON.stringify({
    ok: true,
    data: {
      userId: ctx.userId,
      username,
    },
    error: null,
  });
};
