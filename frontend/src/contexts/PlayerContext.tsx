import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Player } from "@/types/player";

interface PlayerContextValue {
  player: Player | null;
  setPlayer: (player: Player | null) => void;
  clearPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<Player | null>(null);

  const setPlayer = useCallback((next: Player | null) => {
    setPlayerState(next);
  }, []);

  const clearPlayer = useCallback(() => {
    setPlayerState(null);
  }, []);

  const value = useMemo(
    () => ({ player, setPlayer, clearPlayer }),
    [player, setPlayer, clearPlayer]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
