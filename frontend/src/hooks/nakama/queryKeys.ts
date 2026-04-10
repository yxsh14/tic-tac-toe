export const nakamaQueryKeys = {
  session: ["nakama", "session"] as const,
  leaderboard: (displayName: string) => ["nakama", "leaderboard", displayName] as const,
};
