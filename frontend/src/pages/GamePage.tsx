import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MatchData } from "@heroiclabs/nakama-js";
import GameScreen from "@/components/GameScreen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OPCODES } from "@/constants/protocol";
import { ROUTES } from "@/constants/routeConst";
import { useMatchSession } from "@/contexts/MatchSessionContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthoritativeMatchSocket } from "@/hooks/match/useAuthoritativeMatchSocket";
import { useNakamaSession } from "@/hooks/nakama/useNakamaSession";
import { resetMatchSocket } from "@/services/match/matchSocketService";
import type { AuthoritativeMatchState } from "@/types/match";

const decoder = new TextDecoder();

const GamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId") || "";
  const paramRoomCode = searchParams.get("roomCode") || "";
  const { player } = usePlayer();
  const { roomCode: ctxRoomCode, setSession, setLiveState, clearSession } = useMatchSession();

  const [state, setState] = useState<AuthoritativeMatchState | null>(null);
  const [sendingMove, setSendingMove] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const sessionQuery = useNakamaSession(player?.name);
  const socket = useAuthoritativeMatchSocket();

  const roomCode = paramRoomCode || ctxRoomCode || null;

  const nakamaUsername = sessionQuery.data?.username ?? player?.name ?? "";

  const mySymbol = useMemo(() => {
    if (!state || !nakamaUsername) return null;
    return state.players.find((p) => p.username === nakamaUsername)?.symbol ?? null;
  }, [state, nakamaUsername]);

  const resultMessage = useMemo(() => {
    if (!state || state.status !== "finished") return "";
    if (!state.winner) return "Match ended in a draw.";
    if (!mySymbol) return `Match finished. Winner: ${state.winner}.`;
    return state.winner === mySymbol ? "You won the match." : "You lost the match.";
  }, [state, mySymbol]);

  const exitToHome = useCallback(() => {
    console.log("[game] exitToHome: navigate first, then cleanup socket");
    // Navigate FIRST to avoid "websocket not connected" during transition
    navigate(ROUTES.LOBBY, { replace: true });
    // Delay socket cleanup to ensure smooth navigation
    setTimeout(() => {
      resetMatchSocket();
      clearSession();
    }, 100);
  }, [clearSession, navigate]);

  useEffect(() => {
    if (!player) {
      navigate(ROUTES.AUTH, { replace: true });
      return;
    }
    if (!matchId) {
      navigate(ROUTES.LOBBY, { replace: true });
      return;
    }
  }, [player, matchId, navigate]);

  useEffect(() => {
    if (matchId) {
      setSession(matchId, roomCode);
    }
  }, [matchId, roomCode, setSession]);

  useEffect(() => {
    if (!player || !matchId || !sessionQuery.data) return;

    setConnectionStatus("connecting");
    setConnectionError(null);

    const connect = async () => {
      try {
        await socket.connect(sessionQuery.data!, matchId, {
          onMatchData: (msg: MatchData) => {
            if (msg.op_code !== OPCODES.STATE_UPDATE) return;
            const text = decoder.decode(msg.data);
            try {
              const parsed = JSON.parse(text) as AuthoritativeMatchState;
              setState(parsed);
              setLiveState(parsed);
              setConnectionStatus("live");
            } catch {
              setConnectionError("Invalid state payload from backend");
              setConnectionStatus("error");
            }
          },
          onDisconnect: (evt: Event) => {
            console.log("[game] socket disconnected", evt);
            setConnectionStatus("error");
            // Check if this was a clean close or error
            const wasClean = (evt as CloseEvent)?.wasClean ?? false;
            if (!wasClean) {
              setConnectionError("Connection lost. Returning to lobby...");
              // Auto-return to lobby after brief delay
              setTimeout(() => {
                resetMatchSocket();
                clearSession();
                navigate(ROUTES.LOBBY, { replace: true });
              }, 2000);
            } else {
              setConnectionError("Socket disconnected");
            }
          },
        });
      } catch (e) {
        console.error("[game] Failed to connect:", e);
        setConnectionStatus("error");
        const errorMsg = e instanceof Error ? e.message : "Failed to connect match socket";
        setConnectionError(errorMsg);
        // On connection failure, hard reset and go to lobby
        resetMatchSocket();
        clearSession();
        setTimeout(() => {
          navigate(ROUTES.LOBBY, { replace: true });
        }, 2000);
      }
    };

    void connect();

    return () => {
      console.log("[game] GamePage unmount: disconnect");
      // Use hard reset on unmount to ensure clean state
      resetMatchSocket();
      clearSession();
    };
  }, [player, matchId, sessionQuery.data, socket, setLiveState, clearSession, navigate]);

  useEffect(() => {
    if (state?.status === "finished") {
      setResultOpen(true);
    }
  }, [state?.status]);

  // Enhanced leave confirmation based on game state
  const getLeaveConfirmation = () => {
    if (!state) return null;

    if (state.status === "playing") {
      return {
        title: "Leave Match?",
        description:
          "The game is in progress. If you leave now, you will forfeit the match and it will count as a loss.",
        confirmText: "Leave & Forfeit",
        isDestructive: true,
      };
    }

    if (state.status === "waiting_reconnect") {
      return {
        title: "Leave Match?",
        description:
          "Your opponent disconnected. If you leave now, you may win by abandonment, or the match may end in a draw if both leave.",
        confirmText: "Leave Match",
        isDestructive: false,
      };
    }

    if (state.status === "waiting") {
      const hasOpponent = state.players.some((p) => p.username !== nakamaUsername);
      if (hasOpponent) {
        return {
          title: "Leave Room?",
          description: "The room will be closed and your opponent will be returned to the lobby.",
          confirmText: "Close Room",
          isDestructive: false,
        };
      }
      return {
        title: "Leave Room?",
        description: "This room will be closed if you leave. You'll need to create a new room to play again.",
        confirmText: "Close Room",
        isDestructive: false,
      };
    }

    // finished or other states - no confirmation needed
    return null;
  };

  const leaveConfirmation = getLeaveConfirmation();
  const needsLeaveConfirm = leaveConfirmation !== null;

  const handleLeaveRequest = () => {
    if (needsLeaveConfirm) {
      setLeaveConfirmOpen(true);
      return;
    }
    exitToHome();
  };

  if (!player || !matchId) {
    return null;
  }

  return (
    <>
      <GameScreen
        player={player}
        roomCode={roomCode}
        myUsername={nakamaUsername}
        state={state}
        mySymbol={mySymbol}
        sendingMove={sendingMove}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        onMove={async (index) => {
          if (!state || state.status !== "playing") return;
          try {
            setSendingMove(true);
            await socket.sendMove({ position: index });
          } catch (e) {
            setConnectionError(e instanceof Error ? e.message : "Failed to send move");
          } finally {
            setSendingMove(false);
          }
        }}
        onLeaveMatch={handleLeaveRequest}
      />

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{leaveConfirmation?.title ?? "Leave?"}</AlertDialogTitle>
            <AlertDialogDescription>{leaveConfirmation?.description ?? ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLeaveConfirmOpen(false);
                exitToHome();
              }}
              className={leaveConfirmation?.isDestructive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {leaveConfirmation?.confirmText ?? "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={resultOpen}
        onOpenChange={(open) => {
          setResultOpen(open);
          // Only auto-navigate if dialog was closed AND we're still on finished state
          if (!open && state?.status === "finished") {
            // Small delay to ensure dialog closes smoothly before navigation
            setTimeout(() => {
              navigate(ROUTES.LOBBY, { replace: true });
            }, 100);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Finished</DialogTitle>
            <DialogDescription>{resultMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setResultOpen(false);
                // Navigate first, then cleanup socket
                navigate(ROUTES.LOBBY, { replace: true });
              }}
            >
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GamePage;
