import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nakamaQueryKeys } from "@/hooks/nakama/queryKeys";
import { rpcJoinMatchByCode } from "@/services/match/matchRpcService";
import type { JoinMatchResult } from "@/services/match/matchRpc.types";
import { ensureActiveSession } from "@/services/nakama/sessionService";

type Vars = { roomCode: string; displayName?: string };

export function useJoinMatchMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomCode, displayName }: Vars): Promise<JoinMatchResult> => {
      const session = await qc.ensureQueryData({
        queryKey: [...nakamaQueryKeys.session, displayName ?? ""],
        queryFn: () => ensureActiveSession(displayName),
      });
      return rpcJoinMatchByCode(session, roomCode);
    },
  });
}