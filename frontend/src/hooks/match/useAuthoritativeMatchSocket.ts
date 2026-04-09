import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Session, Socket } from "@heroiclabs/nakama-js";
import { OPCODES, type MovePayload } from "@/constants/protocol";
import {
  connectAuthoritativeMatch,
  type MatchSocketHandlers,
} from "@/services/match/matchSocketService";

/**
 * Lifecycle-safe socket helper for the game screen (join authoritative match + listen).
 * GamePage will call `connect(session, matchId, handlers)` after RPC + navigation.
 */
export function useAuthoritativeMatchSocket() {
  const cleanupRef = useRef<(() => void) | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    socketRef.current = null;
    matchIdRef.current = null;
  }, []);

  const connect = useCallback(
    async (session: Session, matchId: string, handlers: MatchSocketHandlers) => {
      disconnect();
      const { socket, disconnect: dc } = await connectAuthoritativeMatch(session, matchId, handlers);
      cleanupRef.current = dc;
      socketRef.current = socket;
      matchIdRef.current = matchId;
    },
    [disconnect]
  );

  const sendMove = useCallback(async (payload: MovePayload) => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket || !matchId) return;
    await socket.sendMatchState(matchId, OPCODES.MOVE, JSON.stringify(payload));
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return useMemo(
    () => ({ connect, disconnect, sendMove }),
    [connect, disconnect, sendMove]
  );
}
