import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nakamaQueryKeys } from "@/hooks/nakama/queryKeys";
import { rpcFindMatch, type CreateMatchRpcPayload } from "@/services/match/matchRpcService";
import type { FindMatchResult } from "@/services/match/matchRpc.types";
import { ensureActiveSession } from "@/services/nakama/sessionService";

type Vars = { displayName?: string } & CreateMatchRpcPayload;

export function useFindMatchMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: Vars = {}): Promise<FindMatchResult> => {
      const { displayName, mode, moveTimeoutSec } = vars;
      const session = await qc.ensureQueryData({
        queryKey: [...nakamaQueryKeys.session, displayName ?? ""],
        queryFn: () => ensureActiveSession(displayName),
      });
      return rpcFindMatch(session, { mode, moveTimeoutSec });
    },
  });
}
