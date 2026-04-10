import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import { PLAYER_STORAGE_KEY } from "@/constants/playerStorage";
import type { Player } from "@/types/player";

interface PlayerContextValue {
  player: Player | null;
  setPlayer: (value: SetStateAction<Player | null>) => void;
  clearPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function readStoredPlayer(): Player | null {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<Player | null>(() => readStoredPlayer());

  const setPlayer = useCallback((next: SetStateAction<Player | null>) => {
    setPlayerState((prev) => {
      const resolved = typeof next === "function" ? (next as (p: Player | null) => Player | null)(prev) : next;
      if (resolved) {
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(resolved));
      } else {
        localStorage.removeItem(PLAYER_STORAGE_KEY);
      }
      return resolved;
    });
  }, []);

  const clearPlayer = useCallback(() => {
    localStorage.removeItem(PLAYER_STORAGE_KEY);
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
