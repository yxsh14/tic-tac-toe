import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nakamaQueryKeys } from "@/hooks/nakama/queryKeys";
import { rpcCreateMatch } from "@/services/match/matchRpcService";
import type { CreateMatchResult } from "@/services/match/matchRpc.types";
import { ensureActiveSession } from "@/services/nakama/sessionService";

type Vars = { displayName?: string };

export function useCreateMatchMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: Vars = {}): Promise<CreateMatchResult> => {
      const session = await qc.ensureQueryData({
        queryKey: [...nakamaQueryKeys.session, vars.displayName ?? ""],
        queryFn: () => ensureActiveSession(vars.displayName),
      });
      return rpcCreateMatch(session);
    },
  });
}