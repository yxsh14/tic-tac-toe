import { Session, type ISession } from "@heroiclabs/nakama-js";
import { getNakamaClient } from "./nakamaClient";

const DEVICE_KEY = "lila_nakama_device_id";
const SESSION_TOKEN_KEY = "lila_nakama_session_token";
const SESSION_REFRESH_KEY = "lila_nakama_refresh_token";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function saveSession(session: ISession): void {
  localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_REFRESH_KEY, session.refresh_token);
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_REFRESH_KEY);
}

export function getStoredSession(): Session | null {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const refresh = localStorage.getItem(SESSION_REFRESH_KEY);
  if (!token || !refresh) return null;
  try {
    return Session.restore(token, refresh);
  } catch {
    clearStoredSession();
    return null;
  }
}

export function getValidStoredSession(): Session | null {
  const session = getStoredSession();
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (session.isexpired(now) && session.isrefreshexpired(now)) {
    clearStoredSession();
    return null;
  }
  return session;
}

export async function ensureDeviceSession(displayName?: string): Promise<Session> {
  const client = getNakamaClient();
  const deviceId = getOrCreateDeviceId();
  const username = (displayName || "Guest").slice(0, 20);
  const session = await client.authenticateDevice(deviceId, true, username);
  saveSession(session);
  return session;
}

export async function ensureActiveSession(displayName?: string): Promise<Session> {
  const existing = getValidStoredSession();
  if (existing) return existing;
  return ensureDeviceSession(displayName);
}

export function clearLocalDeviceId(): void {
  localStorage.removeItem(DEVICE_KEY);
}
