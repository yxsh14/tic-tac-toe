import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { loginWithEmail } from "@/services/auth/authService";

const EmailLoginPage = () => {
  const navigate = useNavigate();
  const { setPlayer } = usePlayer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    try {
      const session = await loginWithEmail({ email: email.trim(), password });
      setPlayer({
        name: session.username ?? email.split("@")[0] ?? "player",
        id: session.user_id ?? "unknown",
        mode: "email",
        email: email.trim().toLowerCase(),
      });
      navigate(ROUTES.LOBBY, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 scanlines crt-vignette">
      <div className="w-full max-w-md">
        <div className="border-2 border-[hsl(var(--tetris-cyan))] bg-card/80 p-6 backdrop-blur-sm box-glow">
          <div className="mb-4 text-xs tetris-text-cyan text-glow">? EMAIL LOGIN</div>
          {error && (
            <p className="mb-3 rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">EMAIL</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 bg-primary font-bold text-primary-foreground"
            >
              {pending ? "…" : "? LOGIN"}
            </Button>
            <Button asChild variant="outline" className="border-2 border-border">
              <Link to={ROUTES.AUTH}>BACK</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link to={ROUTES.AUTH_EMAIL_SIGNUP} className="text-primary underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailLoginPage;