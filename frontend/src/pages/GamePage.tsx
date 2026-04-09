import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MatchData } from "@heroiclabs/nakama-js";
import GameScreen from "@/components/GameScreen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OPCODES } from "@/constants/protocol";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthoritativeMatchSocket } from "@/hooks/match/useAuthoritativeMatchSocket";
import { useNakamaSession } from "@/hooks/nakama/useNakamaSession";
import type { AuthoritativeMatchState } from "@/types/match";

const decoder = new TextDecoder();

const GamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId") || "";
  const { player } = usePlayer();

  const [state, setState] = useState<AuthoritativeMatchState | null>(null);
  const [sendingMove, setSendingMove] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const sessionQuery = useNakamaSession(player?.name);
  const socket = useAuthoritativeMatchSocket();

  const mySymbol = useMemo(() => {
    if (!state || !player) return null;
    return state.players.find((p) => p.userId === player.id)?.symbol ?? null;
  }, [state, player]);

  const resultMessage = useMemo(() => {
    if (!state || state.status !== "finished") return "";
    if (!state.winner) return "Match ended in a draw.";
    if (!mySymbol) return `Match finished. Winner: ${state.winner}.`;
    return state.winner === mySymbol ? "You won the match." : "You lost the match.";
  }, [state, mySymbol]);

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
    if (!player || !matchId || !sessionQuery.data) return;

    setConnectionStatus("connecting");
    setConnectionError(null);

    const connect = async () => {
      try {
        await socket.connect(sessionQuery.data, matchId, {
          onMatchData: (msg: MatchData) => {
            if (msg.op_code !== OPCODES.STATE_UPDATE) return;
            const text = decoder.decode(msg.data);
            try {
              const parsed = JSON.parse(text) as AuthoritativeMatchState;
              setState(parsed);
              setConnectionStatus("live");
            } catch {
              setConnectionError("Invalid state payload from backend");
              setConnectionStatus("error");
            }
          },
          onDisconnect: () => {
            setConnectionStatus("error");
            setConnectionError("Socket disconnected");
          },
        });
      } catch (e) {
        setConnectionStatus("error");
        setConnectionError(e instanceof Error ? e.message : "Failed to connect match socket");
      }
    };

    void connect();

    return () => {
      socket.disconnect();
    };
  }, [player, matchId, sessionQuery.data, socket]);

  useEffect(() => {
    if (state?.status === "finished") {
      setResultOpen(true);
    }
  }, [state?.status]);

  if (!player || !matchId) {
    return null;
  }

  return (
    <>
      <GameScreen
        player={player}
        matchId={matchId}
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
        onBackToLobby={() => navigate(ROUTES.LOBBY)}
      />

      <Dialog
        open={resultOpen}
        onOpenChange={(open) => {
          setResultOpen(open);
          if (!open && state?.status === "finished") {
            navigate(ROUTES.HOME, { replace: true });
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
                navigate(ROUTES.HOME, { replace: true });
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