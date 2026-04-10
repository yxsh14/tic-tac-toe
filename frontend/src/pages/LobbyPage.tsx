import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LobbyScreen from "@/components/LobbyScreen";
import { ROUTES } from "@/constants/routeConst";
import { useMatchSession } from "@/contexts/MatchSessionContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useCreateMatchMutation } from "@/hooks/match/useCreateMatchMutation";
import { useFindMatchMutation } from "@/hooks/match/useFindMatchMutation";
import { useJoinMatchMutation } from "@/hooks/match/useJoinMatchMutation";
import { useNakamaSession } from "@/hooks/nakama/useNakamaSession";
import { resetMatchSocket } from "@/services/match/matchSocketService";
import type { GameMode } from "@/types/match";
import { logoutFromFrontend } from "@/services/auth/authService";

const LobbyPage = () => {
  const navigate = useNavigate();
  const { player, clearPlayer } = usePlayer();
  const { setSession, clearSession, matchId: existingMatchId } = useMatchSession();
  const [roomId, setRoomId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [moveTimeoutSec, setMoveTimeoutSec] = useState<30 | 60>(60);

  // Prevent multiple rapid clicks - debounce protection
  const [isActionPending, setIsActionPending] = useState(false);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionQuery = useNakamaSession(player?.name);
  const createMut = useCreateMatchMutation();
  const joinMut = useJoinMatchMutation();
  const findMut = useFindMatchMutation();

  useEffect(() => {
    if (!player) {
      navigate(ROUTES.AUTH, { replace: true });
    }
  }, [player, navigate]);

  // CRITICAL: Reset socket on mount to clear any stale state
  useEffect(() => {
    resetMatchSocket();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  const setActionPending = useCallback((pending: boolean) => {
    setIsActionPending(pending);
    if (pending) {
      // Auto-clear after 1 second max (safety)
      actionTimeoutRef.current = setTimeout(() => {
        setIsActionPending(false);
      }, 1000);
    }
  }, []);

  if (!player) {
    return null;
  }

  const goGame = useCallback((matchId: string, roomCode: string | null) => {
    // CRITICAL: Check if already in a match - prevent duplicate joins
    if (existingMatchId && existingMatchId !== matchId) {
      console.log("[lobby] Already in a different match, clearing first");
      resetMatchSocket();
      clearSession();
    }
    setSession(matchId, roomCode);
    const q = new URLSearchParams();
    q.set("matchId", matchId);
    if (roomCode) q.set("roomCode", roomCode);
    navigate(`${ROUTES.GAME}?${q.toString()}`);
  }, [existingMatchId, setSession, clearSession, navigate]);

  const handleCreate = async () => {
    if (isActionPending || createMut.isPending) return;
    setActionPending(true);
    setRpcError(null);

    try {
      const r = await createMut.mutateAsync({
        displayName: player.name,
        mode: gameMode,
        moveTimeoutSec: gameMode === "timed" ? moveTimeoutSec : undefined,
      });
      if (!r.ok || !r.data?.matchId) {
        setRpcError(r.error || "Could not create match.");
        setActionPending(false);
        return;
      }
      setCreatedMatchId(r.data.matchId);
      setCreatedRoomCode(r.data.roomCode || "");
      setWaiting(true);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : "Network error (is Nakama running?)");
    } finally {
      setActionPending(false);
    }
  };

  const handleJoin = async () => {
    if (isActionPending || joinMut.isPending) return;
    setActionPending(true);
    setRpcError(null);

    const id = roomId.trim();
    if (!id) {
      setActionPending(false);
      return;
    }

    try {
      const r = await joinMut.mutateAsync({ roomCode: id, displayName: player.name });
      if (!r.ok) {
        setRpcError(r.error || "Could not join match.");
        setActionPending(false);
        return;
      }
      const mid = r.data?.matchId || id;
      const code = r.data?.roomCode ?? id.toUpperCase().replace(/[^A-Z0-9]/g, "");
      goGame(mid, code || null);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : "Network error (is Nakama running?)");
      setActionPending(false);
    }
  };

  const handleQuickPlay = async () => {
    if (isActionPending || findMut.isPending) return;
    setActionPending(true);
    setRpcError(null);

    try {
      const r = await findMut.mutateAsync({
        displayName: player.name,
        mode: gameMode,
        moveTimeoutSec: gameMode === "timed" ? moveTimeoutSec : undefined,
      });
      if (!r.ok || !r.data?.matchId) {
        setRpcError(r.error || "Matchmaking failed.");
        setActionPending(false);
        return;
      }
      goGame(r.data.matchId, r.data.roomCode);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : "Network error (is Nakama running?)");
      setActionPending(false);
    }
  };

  return (
    <LobbyScreen
      player={player}
      roomId={roomId}
      onRoomIdChange={setRoomId}
      waiting={waiting}
      createdMatchId={createdMatchId}
      createdRoomCode={createdRoomCode}
      gameMode={gameMode}
      onGameModeChange={setGameMode}
      moveTimeoutSec={moveTimeoutSec}
      onMoveTimeoutSecChange={setMoveTimeoutSec}
      onCreate={handleCreate}
      onJoin={handleJoin}
      onQuickPlay={() => void handleQuickPlay()}
      onEnterCreatedMatch={() => goGame(createdMatchId, createdRoomCode || null)}
      onCancelWaiting={() => {
        // CRITICAL: Reset socket when canceling to ensure clean state
        resetMatchSocket();
        setWaiting(false);
        setCreatedMatchId("");
        setCreatedRoomCode("");
        clearSession();
      }}
      onLogout={() => {
        logoutFromFrontend();
        clearPlayer();
        clearSession();
        navigate(ROUTES.AUTH, { replace: true });
      }}
      isCreating={createMut.isPending || isActionPending}
      isJoining={joinMut.isPending || isActionPending}
      isFinding={findMut.isPending || isActionPending}
      rpcError={rpcError}
      sessionReady={sessionQuery.isSuccess}
      sessionError={sessionQuery.isError}
    />
  );
};

export default LobbyPage;
