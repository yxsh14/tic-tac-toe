import { useQuery } from "@tanstack/react-query";
import { ensureActiveSession } from "@/services/nakama/sessionService";
import { nakamaQueryKeys } from "./queryKeys";

/**
 * Device-authenticated Nakama session for RPC + socket.
 * `displayName` should match the in-app player when available.
 */
export function useNakamaSession(displayName?: string) {
  return useQuery({
    queryKey: [...nakamaQueryKeys.session, displayName ?? ""],
    queryFn: () => ensureActiveSession(displayName),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
