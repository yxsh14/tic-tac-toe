import { useProfileSync } from "@/hooks/nakama/useProfileSync";

/**
 * Mount once under `PlayerProvider` to hydrate `PlayerContext` from `get_profile`.
 */
export function ProfileSync() {
  useProfileSync();
  return null;
}
