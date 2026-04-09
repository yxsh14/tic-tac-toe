import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Starfield from "@/components/Starfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Player } from "@/types/player";

export interface LobbyScreenProps {
  player: Player;
  roomId: string;
  onRoomIdChange: (value: string) => void;
  waiting: boolean;
  createdMatchId: string;
  onCreate: () => void;
  onJoin: () => void;
  /** From waiting room: open game route with the created match id. */
  onEnterCreatedMatch: () => void;
  onCancelWaiting: () => void;
  onLogout: () => void;
  isCreating: boolean;
  isJoining: boolean;
  rpcError: string | null;
  sessionReady: boolean;
  sessionError: boolean;
}

const LobbyScreen = ({
  player,
  roomId,
  onRoomIdChange,
  waiting,
  createdMatchId,
  onCreate,
  onJoin,
  onEnterCreatedMatch,
  onCancelWaiting,
  onLogout,
  isCreating,
  isJoining,
  rpcError,
  sessionReady,
  sessionError,
}: LobbyScreenProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMatchId = async () => {
    if (!createdMatchId) return;
    try {
      await navigator.clipboard.writeText(createdMatchId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 scanlines crt-vignette">
      <Starfield />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-3 text-center text-2xl font-bold tetris-text-cyan text-glow">
          TIC TAC TOE
        </div>

        <div className="mb-4 border-2 border-[hsl(var(--tetris-purple))] bg-card/80 p-4 backdrop-blur-sm box-glow-purple">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">OPERATOR LOGGED IN</div>
            <div className="text-lg tetris-text-cyan text-glow">{player.name}</div>
            <div className="text-xs text-muted-foreground">
              ID: <span className="tetris-text-yellow">{player.id}</span> | MODE:{" "}
              <span className="tetris-text-green">{player.mode.toUpperCase()}</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Nakama session:{" "}
              {sessionError ? (
                <span className="text-destructive">failed — check server / .env</span>
              ) : sessionReady ? (
                <span className="tetris-text-green">ready</span>
              ) : (
                <span>connecting…</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="border-2 border-[hsl(var(--tetris-red))] px-2 py-1 text-xs tetris-text-red transition-all hover:box-glow-red hover:opacity-70"
          >
            DISCONNECT
          </button>
        </div>
      </div>

      {rpcError && (
        <div className="mb-3 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {rpcError}
        </div>
      )}

        <div className="border-2 border-[hsl(var(--tetris-cyan))] bg-card/80 p-6 backdrop-blur-sm box-glow">
        <div className="mb-4 border-b border-border pb-2 text-xs tetris-text-yellow">
          ┌─ MATCHMAKING TERMINAL (RPC) ─────────────┐
        </div>

        {!waiting ? (
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-sm text-foreground">
                <span className="font-bold tetris-text-green">[A]</span> CREATE MATCH
              </div>
              <Button
                type="button"
                onClick={onCreate}
                disabled={isCreating || !sessionReady}
                className="w-full bg-[hsl(var(--tetris-green))] text-base font-bold text-background hover:bg-[hsl(var(--tetris-green)/0.8)]"
              >
                {isCreating ? "…" : "▶ CREATE (create_match RPC)"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-[hsl(var(--tetris-purple))]" />
              <span className="text-xs tetris-text-purple">OR</span>
              <div className="flex-1 border-t border-[hsl(var(--tetris-purple))]" />
            </div>

            <div>
              <div className="mb-2 text-sm text-foreground">
                <span className="font-bold tetris-text-cyan">[B]</span> JOIN MATCH
              </div>
              <div className="flex gap-2">
                <Input
                  value={roomId}
                  onChange={(e) => onRoomIdChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onJoin()}
                  placeholder="Match ID (UUID from host)"
                  className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60 font-mono text-sm text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  onClick={onJoin}
                  disabled={isJoining || !sessionReady || !roomId.trim()}
                  variant="outline"
                  className="border-2 border-[hsl(var(--tetris-cyan))] font-bold tetris-text-cyan hover:bg-[hsl(var(--tetris-cyan)/0.1)]"
                >
                  {isJoining ? "…" : "JOIN"}
                </Button>
              </div>
            </div>
          </div>
          ) : (
            <div className="space-y-4 py-6 text-center">
              <div className="text-lg text-glow-accent tetris-text-yellow">WAITING ROOM</div>
              <div className="text-foreground">
                Share match id with opponent<span className="animate-pulse">...</span>
              </div>
              <div className="inline-flex items-center gap-2 border-2 border-[hsl(var(--tetris-yellow))] p-3 box-glow-yellow">
                <span className="break-all font-mono text-sm tetris-text-yellow">{createdMatchId}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => void handleCopyMatchId()}
                  className="h-8 w-8 border-[hsl(var(--tetris-yellow))] text-[hsl(var(--tetris-yellow))]"
                  aria-label="Copy room id"
                  title="Copy room id"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {copied ? "Room id copied" : "Copy and send this room id to your friend"}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={onEnterCreatedMatch}
                  className="bg-primary font-bold text-primary-foreground"
                >
                  ▶ ENTER MATCH
                </Button>
                <Button
                  type="button"
                  onClick={onCancelWaiting}
                  variant="outline"
                  className="border-2 border-border text-xs text-foreground hover:border-[hsl(var(--tetris-red))]"
                >
                  CANCEL
                </Button>
              </div>
            </div>
          )}

        <div className="mt-6 border-t border-border pt-2 text-xs tetris-text-purple">
          └─ AWAITING INPUT ─────────────────────────┘
        </div>
      </div>

        <div className="mt-4 flex justify-between text-xs">
          <span className="text-muted-foreground">
            RPC: <span className="tetris-text-green">create_match</span> /{" "}
            <span className="tetris-text-green">join_match</span>
          </span>
          <span className="animate-pulse tetris-text-cyan">● SOCKET NEXT</span>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
