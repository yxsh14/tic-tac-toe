import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthoritativeMatchState } from "@/types/match";

export type MatchSessionStatus = "none" | "creating" | "waiting" | "joining" | "active" | "error";

type MatchSessionValue = {
  matchId: string | null;
  roomCode: string | null;
  /** Latest authoritative snapshot (board, players, status) for global access. */
  liveState: AuthoritativeMatchState | null;
  /** Current session status for global UI state management */
  sessionStatus: MatchSessionStatus;
  /** Error message if sessionStatus is 'error' */
  sessionError: string | null;
  setSession: (matchId: string, roomCode: string | null) => void;
  setLiveState: (state: AuthoritativeMatchState | null) => void;
  setSessionStatus: (status: MatchSessionStatus, error?: string | null) => void;
  clearSession: () => void;
};

const MatchSessionContext = createContext<MatchSessionValue | null>(null);

export function MatchSessionProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<AuthoritativeMatchState | null>(null);
  const [sessionStatus, setSessionStatusState] = useState<MatchSessionStatus>("none");
  const [sessionError, setSessionError] = useState<string | null>(null);

  const setSession = useCallback((mid: string, code: string | null) => {
    setMatchId(mid);
    setRoomCode(code);
    setSessionError(null);
  }, []);

  const setSessionStatus = useCallback((status: MatchSessionStatus, error: string | null = null) => {
    setSessionStatusState(status);
    setSessionError(error);
  }, []);

  const clearSession = useCallback(() => {
    setMatchId(null);
    setRoomCode(null);
    setLiveState(null);
    setSessionStatusState("none");
    setSessionError(null);
  }, []);

  const value = useMemo(
    () => ({
      matchId,
      roomCode,
      liveState,
      sessionStatus,
      sessionError,
      setSession,
      setLiveState,
      setSessionStatus,
      clearSession,
    }),
    [matchId, roomCode, liveState, sessionStatus, sessionError, setSession, setSessionStatus, clearSession]
  );

  return <MatchSessionContext.Provider value={value}>{children}</MatchSessionContext.Provider>;
}

export function useMatchSession() {
  const ctx = useContext(MatchSessionContext);
  if (!ctx) {
    throw new Error("useMatchSession must be used within MatchSessionProvider");
  }
  return ctx;
}
