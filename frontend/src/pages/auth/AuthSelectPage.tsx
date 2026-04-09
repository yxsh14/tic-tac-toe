import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routeConst";

const AuthSelectPage = () => (
  <div className="flex min-h-screen items-center justify-center p-4 scanlines crt-vignette">
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1
          className="mb-2 text-3xl tracking-widest tetris-text-cyan text-glow sm:text-4xl"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(1rem, 4vw, 1.5rem)" }}
        >
          TIC TAC TOE
        </h1>
        <p className="text-sm tetris-text-purple text-glow-purple">SELECT YOUR IDENTITY</p>
      </div>

      <div className="border-2 border-[hsl(var(--tetris-cyan))] bg-card/80 p-6 backdrop-blur-sm box-glow">
        <div className="mb-4 border-b border-border pb-2 text-xs tetris-text-yellow">
          ┌─ AUTHENTICATION ─────────────────────────┐
        </div>
        <div className="space-y-3">
          <Link
            to={ROUTES.AUTH_GUEST}
            className="block w-full border-2 border-border p-3 text-left text-foreground transition-all hover:tetris-border-green hover:box-glow-green"
          >
            <span className="font-bold tetris-text-green">[1]</span> GUEST ACCESS
            <span className="mt-1 block text-xs text-muted-foreground">No credentials required</span>
          </Link>
          <Link
            to={ROUTES.AUTH_EMAIL_LOGIN}
            className="block w-full border-2 border-border p-3 text-left text-foreground transition-all hover:tetris-border-cyan hover:box-glow"
          >
            <span className="font-bold tetris-text-cyan">[2]</span> EMAIL
            <span className="mt-1 block text-xs text-muted-foreground">Login or create account</span>
          </Link>
        </div>
        <div className="mt-4 border-t border-border pt-2 text-xs tetris-text-purple">
          └─ SELECT OPTION [1-2] ─────────────────────┘
        </div>
      </div>
    </div>
  </div>
);

export default AuthSelectPage;
