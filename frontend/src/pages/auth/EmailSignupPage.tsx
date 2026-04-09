import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { signupWithEmail } from "@/services/auth/authService";

const EmailSignupPage = () => {
  const navigate = useNavigate();
  const { setPlayer } = usePlayer();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !email.trim() || !password) {
      setError("Username, email, and password are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for password.");
      return;
    }

    setPending(true);
    try {
      const session = await signupWithEmail({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setPlayer({
        name: session.username ?? username.trim(),
        id: session.user_id ?? "unknown",
        mode: "email",
        email: email.trim().toLowerCase(),
      });
      navigate(ROUTES.LOBBY, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 scanlines crt-vignette">
      <div className="w-full max-w-md">
        <div className="border-2 border-[hsl(var(--tetris-cyan))] bg-card/80 p-6 backdrop-blur-sm box-glow">
          <div className="mb-2 text-xs tetris-text-cyan text-glow">? EMAIL SIGN UP</div>
          {error && (
            <p className="mb-3 rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">USERNAME (DISPLAY NAME)</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="PixelPilot"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="username"
                autoFocus
                maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">EMAIL</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CONFIRM PASSWORD</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="border-2 border-[hsl(var(--tetris-cyan))] bg-background/60"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 bg-primary font-bold text-primary-foreground"
            >
              {pending ? "…" : "? CREATE ACCOUNT"}
            </Button>
            <Button asChild variant="outline" className="border-2 border-border">
              <Link to={ROUTES.AUTH}>BACK</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to={ROUTES.AUTH_EMAIL_LOGIN} className="text-primary underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailSignupPage;