export interface Player {
  name: string;
  id: string;
  mode: "guest" | "email";
  /** Set when `mode === "email"` after login/signup. */
  email?: string;
}
