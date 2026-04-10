import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/contexts/PlayerContext";
import { nakamaQueryKeys } from "@/hooks/nakama/queryKeys";
import { rpcGetProfile } from "@/services/nakama/profileRpcService";
import { ensureActiveSession, getValidStoredSession } from "@/services/nakama/sessionService";

/**
 * After reload: sync displayed name/id with Nakama `get_profile` when a session token exists.
 */
export function useProfileSync() {
  const { player, setPlayer } = usePlayer();
  const hasSession = !!getValidStoredSession();

  const sessionQuery = useQuery({
    queryKey: [...nakamaQueryKeys.session, "bootstrap", player?.name ?? ""],
    queryFn: () => ensureActiveSession(player?.name),
    enabled: hasSession,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const profileQuery = useQuery({
    queryKey: [...nakamaQueryKeys.session, "profile", sessionQuery.data?.user_id ?? ""],
    queryFn: () => rpcGetProfile(sessionQuery.data!),
    enabled: !!sessionQuery.data,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    if (!profileQuery.data?.ok || !profileQuery.data.data) return;
    const d = profileQuery.data.data;
    setPlayer((prev) => {
      if (prev && prev.id === d.userId && prev.name === d.username) return prev;
      return {
        mode: prev?.mode ?? "guest",
        name: d.username,
        id: d.userId,
        email: prev?.email,
      };
    });
  }, [profileQuery.data, setPlayer]);
}
