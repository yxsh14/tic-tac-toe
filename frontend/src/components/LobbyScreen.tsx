import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Starfield from "@/components/Starfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Player } from "@/types/player";
import type { GameMode } from "@/types/match";

export interface LobbyScreenProps {
  player: Player;
  roomId: string;
  onRoomIdChange: (value: string) => void;
  waiting: boolean;
  createdMatchId: string;
  createdRoomCode: string;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  moveTimeoutSec: 30 | 60;
  onMoveTimeoutSecChange: (sec: 30 | 60) => void;
  onCreate: () => void;
  onJoin: () => void;
  onQuickPlay: () => void;
  onEnterCreatedMatch: () => void;
  onCancelWaiting: () => void;
  onLogout: () => void;
  isCreating: boolean;
  isJoining: boolean;
  isFinding: boolean;
  rpcError: string | null;
  sessionReady: boolean;
  sessionError: boolean;
}

const LobbyScreen = ({
  player,
  roomId,
  onRoomIdChange,
  waiting,
  createdRoomCode,
  gameMode,
  onGameModeChange,
  moveTimeoutSec,
  onMoveTimeoutSecChange,
  onCreate,
  onJoin,
  onQuickPlay,
  onEnterCreatedMatch,
  onCancelWaiting,
  onLogout,
  isCreating,
  isJoining,
  isFinding,
  rpcError,
  sessionReady,
  sessionError,
}: LobbyScreenProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomCode = async () => {
    if (!createdRoomCode) return;
    try {
      await navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const modeBusy = isCreating || isFinding;

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
              <div className="text-xs text-muted-foreground">PLAYER LOGGED IN</div>
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
            ┌─ MATCHMAKING TERMINAL ─────────────────┐
          </div>

          {!waiting ? (
            <div className="space-y-6">
              <div className="space-y-3 rounded border border-border/60 bg-background/40 p-3">
                <div className="text-sm font-bold tetris-text-green">GAME MODE</div>
                <RadioGroup
                  value={gameMode}
                  onValueChange={(v) => onGameModeChange(v as GameMode)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="classic" id="mode-classic" />
                    <Label htmlFor="mode-classic" className="cursor-pointer text-sm">
                      Classic — no move timer
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="timed" id="mode-timed" />
                    <Label htmlFor="mode-timed" className="cursor-pointer text-sm">
                      Timed — per-move limit
                    </Label>
                  </div>
                </RadioGroup>
                {gameMode === "timed" ? (
                  <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
                    <div className="text-xs text-muted-foreground">Move time</div>
                    <RadioGroup
                      value={String(moveTimeoutSec)}
                      onValueChange={(v) => onMoveTimeoutSecChange(Number(v) as 30 | 60)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="30" id="t30" />
                        <Label htmlFor="t30" className="cursor-pointer text-sm">
                          30s
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="60" id="t60" />
                        <Label htmlFor="t60" className="cursor-pointer text-sm">
                          60s
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-sm text-foreground">
                  <span className="font-bold tetris-text-green">[A]</span> QUICK PLAY
                </div>
                <Button
                  type="button"
                  onClick={onQuickPlay}
                  disabled={modeBusy || !sessionReady}
                  className="w-full bg-[hsl(var(--tetris-purple))] text-base font-bold text-primary-foreground hover:bg-[hsl(var(--tetris-purple)/0.85)]"
                >
                  {isFinding ? "…" : "⚡ QUICK PLAY"}
                </Button>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Finds an open match or creates one with your selected mode.
                </p>
              </div>

              <div>
                <div className="mb-2 text-sm text-foreground">
                  <span className="font-bold tetris-text-green">[B]</span> CREATE ROOM
                </div>
                <Button
                  type="button"
                  onClick={onCreate}
                  disabled={modeBusy || !sessionReady}
                  className="w-full bg-[hsl(var(--tetris-green))] text-base font-bold text-background hover:bg-[hsl(var(--tetris-green)/0.8)]"
                >
                  {isCreating ? "…" : "▶ CREATE ROOM"}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[hsl(var(--tetris-purple))]" />
                <span className="text-xs tetris-text-purple">OR</span>
                <div className="flex-1 border-t border-[hsl(var(--tetris-purple))]" />
              </div>

              <div>
                <div className="mb-2 text-sm text-foreground">
                  <span className="font-bold tetris-text-cyan">[C]</span> JOIN ROOM
                </div>
                <div className="flex gap-2">
                  <Input
                    value={roomId}
                    onChange={(e) => onRoomIdChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onJoin()}
                    placeholder="Room code"
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
                Share room code with opponent<span className="animate-pulse">...</span>
              </div>
              <div className="inline-flex items-center gap-2 border-2 border-[hsl(var(--tetris-yellow))] p-3 box-glow-yellow">
                <span className="break-all font-mono text-sm tetris-text-yellow">
                  {createdRoomCode || "—"}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => void handleCopyRoomCode()}
                  disabled={!createdRoomCode}
                  className="h-8 w-8 border-[hsl(var(--tetris-yellow))] text-[hsl(var(--tetris-yellow))]"
                  aria-label="Copy room code"
                  title="Copy room code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {copied ? "Room code copied" : "Copy and send this room code to your friend"}
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
            Quick Play / Create / Join — one live match socket at a time
          </span>
          <span className="animate-pulse tetris-text-cyan">● LIVE</span>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
