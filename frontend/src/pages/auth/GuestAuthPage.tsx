import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { loginAsGuest } from "@/services/auth/authService";

const GuestAuthPage = () => {
  const navigate = useNavigate();
  const { setPlayer } = usePlayer();
  const [guestName, setGuestName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuest = async () => {
    if (!guestName.trim()) return;
    setPending(true);
    setError(null);
    try {
      const session = await loginAsGuest(guestName.trim());
      setPlayer({
        name: session.username ?? guestName.trim(),
        id: session.user_id ?? "unknown",
        mode: "guest",
      });
      navigate(ROUTES.LOBBY, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guest login failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 scanlines crt-vignette">
      <div className="w-full max-w-md">
        <div className="border-2 border-[hsl(var(--tetris-green))] bg-card/80 p-6 backdrop-blur-sm box-glow-green">
          <div className="mb-4 text-xs tetris-text-green text-glow-green">? GUEST MODE</div>
          {error && (
            <p className="mb-3 rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted-foreground">PLAYER NAME:</label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !pending && handleGuest()}
              placeholder="Enter your name..."
              className="border-2 border-[hsl(var(--tetris-green))] bg-background/60 text-foreground placeholder:text-muted-foreground"
              autoFocus
              maxLength={24}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGuest}
              disabled={!guestName.trim() || pending}
              className="flex-1 bg-[hsl(var(--tetris-green))] font-bold text-background hover:bg-[hsl(var(--tetris-green)/0.8)]"
            >
              {pending ? "…" : "? CONNECT"}
            </Button>
            <Button asChild variant="outline" className="border-2 border-border">
              <Link to={ROUTES.AUTH}>BACK</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestAuthPage;