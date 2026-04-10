import type { LeaderboardEntry } from "@/services/match/matchRpc.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LeaderboardProps = {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyHint?: string;
};

const Leaderboard = ({ entries, isLoading, errorMessage, emptyHint }: LeaderboardProps) => {
  if (errorMessage) {
    return (
      <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading leaderboard…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center">{emptyHint ?? "No ranked players yet."}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-primary/20">
      <Table>
        <TableHeader>
          <TableRow className="border-primary/20 hover:bg-transparent">
            <TableHead className="w-12 text-primary">#</TableHead>
            <TableHead className="text-primary">Player</TableHead>
            <TableHead className="text-right text-primary">Rating</TableHead>
            <TableHead className="text-right text-muted-foreground">Win</TableHead>
            <TableHead className="text-right text-muted-foreground">Loss</TableHead>
            <TableHead className="text-right text-muted-foreground">Draw</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((row) => (
            <TableRow key={`${row.rank}-${row.username}`} className="border-border/60">
              <TableCell className="font-mono text-muted-foreground">{row.rank}</TableCell>
              <TableCell className="font-medium">{row.username}</TableCell>
              <TableCell className="text-right font-mono">{Math.round(row.rating)}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{row.wins}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{row.losses}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{row.draws}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;
