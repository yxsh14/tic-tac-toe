const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "7350";
const DEFAULT_SERVER_KEY = "defaultkey";

function envBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const nakamaConfig = {
  host: import.meta.env.VITE_NAKAMA_HOST || DEFAULT_HOST,
  port: import.meta.env.VITE_NAKAMA_PORT || DEFAULT_PORT,
  serverKey: import.meta.env.VITE_NAKAMA_SERVER_KEY || DEFAULT_SERVER_KEY,
  useSSL: envBool(import.meta.env.VITE_NAKAMA_USE_SSL, false),
} as const;
