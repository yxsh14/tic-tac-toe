import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routeConst";

const HomePage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
    <div className="text-center">
      <h1
        className="mb-2 text-3xl font-bold tracking-widest text-primary"
        style={{ fontFamily: "var(--font-pixel)" }}
      >
        LILA GAMES
      </h1>
      <p className="text-muted-foreground">Tic-Tac-Toe — Retro arena</p>
    </div>
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild size="lg">
        <Link to={ROUTES.AUTH}>Play</Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link to={ROUTES.LOBBY}>Lobby</Link>
      </Button>
    </div>
  </div>
);

export default HomePage;
