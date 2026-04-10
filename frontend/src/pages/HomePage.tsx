import { Link } from "react-router-dom";
import Leaderboard from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLeaderboardQuery } from "@/hooks/nakama/useLeaderboardQuery";

const HomePage = () => {
  const { player } = usePlayer();
  const lb = useLeaderboardQuery(player?.name, !!player);

  const entries = lb.data?.ok && lb.data.data?.entries ? lb.data.data.entries : [];
  const lbError =
    lb.data && !lb.data.ok ? (lb.data.error ?? "Could not load leaderboard.") : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="text-center">
        <h1
          className="mb-2 text-3xl font-bold tracking-widest text-primary"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          LILA GAMES
        </h1>
        <p className="text-muted-foreground">Tic-Tac-Toe — Retro arena</p>
      </div>

      <div className="w-full max-w-xl space-y-3">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-primary">
          Top players
        </h2>
        {!player ? (
          <Leaderboard
            entries={[]}
            emptyHint="Sign in to load the live leaderboard and climb the ranks."
          />
        ) : (
          <Leaderboard
            entries={entries}
            isLoading={lb.isLoading}
            errorMessage={lb.isError ? (lb.error?.message ?? "Network error") : lbError}
            emptyHint="No leaderboard data yet. Play a match to earn a rating."
          />
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to={player ? ROUTES.LOBBY : ROUTES.AUTH}>{player ? "Play" : "Sign in to play"}</Link>
        </Button>
        {!player ? (
          <Button asChild size="lg" variant="outline">
            <Link to={ROUTES.AUTH}>Sign in</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default HomePage;
