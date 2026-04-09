import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import Starfield from "@/components/Starfield";
import { Button } from "@/components/ui/button";
import type { Player } from "@/types/player";
import type { AuthoritativeMatchState, BoardCell } from "@/types/match";

interface GameScreenProps {
  player: Player;
  matchId: string;
  state: AuthoritativeMatchState | null;
  mySymbol: "X" | "O" | null;
  onMove: (index: number) => void;
  onBackToLobby: () => void;
  sendingMove: boolean;
  connectionStatus: "connecting" | "live" | "error";
  connectionError: string | null;
}

const symbolColor = (cell: BoardCell) => {
  if (cell === "X") return "tetris-text-cyan text-glow";
  if (cell === "O") return "tetris-text-orange text-glow-accent";
  return "";
};

const GameScreen = ({
  player,
  matchId,
  state,
  mySymbol,
  onMove,
  onBackToLobby,
  sendingMove,
  connectionStatus,
  connectionError,
}: GameScreenProps) => {
  const [copied, setCopied] = useState(false);

  const countdown = useMemo(() => {
    if (!state?.moveDeadline) return null;
    const secs = Math.max(0, Math.ceil((state.moveDeadline - Date.now()) / 1000));
    return secs;
  }, [state?.moveDeadline, state?.board, state?.currentTurn]);

  const myTurn = !!state && !!mySymbol && state.currentTurn === mySymbol && state.status === "playing";

  const opponent = state?.players.find((p) => p.userId !== player.id) ?? null;
  const handleCopyMatchId = async () => {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 scanlines crt-vignette">
      <Starfield />

      <div className="relative z-20 mb-2 flex w-full max-w-2xl items-center justify-between gap-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[10px] text-muted-foreground">
        <div className="truncate">
          <span className="text-primary">MATCH</span> {matchId}
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => void handleCopyMatchId()}
          className="h-6 w-6 border-primary/50"
          aria-label="Copy room id"
          title="Copy room id"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between text-xs">
          <button onClick={onBackToLobby} className="text-muted-foreground transition-colors hover:tetris-text-cyan">
            ? BACK TO LOBBY
          </button>
          <span className="tetris-text-purple text-glow-purple">SERVER AUTHORITATIVE</span>
        </div>

        {connectionError ? (
          <div className="mb-3 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {connectionError}
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="border-2 border-border bg-card/80 p-3 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground">YOU</div>
            <div className="truncate text-sm font-bold text-foreground sm:text-base">{player.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">ID: <span className="tetris-text-yellow">{player.id}</span></div>
            <div className="mt-1 text-xl font-bold tetris-text-cyan">{mySymbol ?? "?"}</div>
          </div>

          <div className="border-2 tetris-border-purple bg-card/80 p-3 backdrop-blur-sm box-glow-purple">
            <div className="text-xs tetris-text-purple">TURN TIMER</div>
            <div className="text-3xl font-bold tetris-text-cyan text-glow">{countdown ?? "--"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {state ? (myTurn ? "YOUR TURN" : `TURN: ${state.currentTurn}`) : "WAITING STATE..."}
            </div>
          </div>

          <div className="border-2 border-border bg-card/80 p-3 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground">OPPONENT</div>
            <div className="truncate text-sm font-bold text-foreground sm:text-base">
              {opponent ? opponent.userId : "Waiting..."}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              CONNECTED: <span className={opponent?.isConnected ? "tetris-text-green" : "tetris-text-red"}>{String(!!opponent?.isConnected)}</span>
            </div>
            <div className="mt-1 text-xl font-bold tetris-text-orange">{mySymbol === "X" ? "O" : mySymbol === "O" ? "X" : "?"}</div>
          </div>
        </div>

        <div className="border-2 tetris-border-cyan bg-card/80 p-4 backdrop-blur-sm box-glow sm:p-6">
          <div className="mx-auto grid aspect-square max-w-xs grid-cols-3 gap-2">
            {(state?.board ?? Array(9).fill("")).map((cell: BoardCell, i: number) => (
              <button
                key={i}
                onClick={() => onMove(i)}
                disabled={!!cell || !myTurn || sendingMove || connectionStatus !== "live"}
                className={`
                  aspect-square border-2 border-border text-3xl font-bold sm:text-5xl
                  flex items-center justify-center transition-all
                  ${cell ? "cursor-default" : "cursor-pointer hover:bg-[hsl(var(--tetris-cyan)/0.05)] hover:tetris-border-cyan"}
                  ${symbolColor(cell)}
                `}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-2 border-border bg-card/70 p-3 text-center text-xs">
          {!state ? (
            <span className="text-muted-foreground">Waiting for first state update from backend...</span>
          ) : state.status === "finished" ? (
            <span className="tetris-text-yellow text-glow-accent">
              {state.winner ? `MATCH FINISHED ? WINNER: ${state.winner}` : "MATCH FINISHED ? DRAW"}
            </span>
          ) : (
            <span className="text-foreground">STATUS: {state.status.toUpperCase()}</span>
          )}
        </div>

        <div className="mt-4 flex justify-between text-xs">
          <span className="text-muted-foreground">
            SEND: {sendingMove ? <span className="tetris-text-yellow">sending...</span> : <span className="tetris-text-green">idle</span>}
          </span>
          <span className={connectionStatus === "live" ? "animate-pulse tetris-text-cyan" : connectionStatus === "error" ? "tetris-text-red" : "tetris-text-yellow"}>
            ? {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;