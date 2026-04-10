import { useQuery } from "@tanstack/react-query";
import { nakamaQueryKeys } from "@/hooks/nakama/queryKeys";
import { rpcGetLeaderboard } from "@/services/match/matchRpcService";
import type { GetLeaderboardResult } from "@/services/match/matchRpc.types";
import { ensureActiveSession } from "@/services/nakama/sessionService";

export function useLeaderboardQuery(displayName: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: nakamaQueryKeys.leaderboard(displayName ?? ""),
    queryFn: async (): Promise<GetLeaderboardResult> => {
      const session = await ensureActiveSession(displayName);
      return rpcGetLeaderboard(session);
    },
    enabled: enabled && !!displayName?.trim(),
    staleTime: 30_000,
  });
}
