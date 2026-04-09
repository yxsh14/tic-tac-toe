import type { Session } from "@heroiclabs/nakama-js";
import { getNakamaClient } from "@/services/nakama/nakamaClient";
import {
  clearLocalDeviceId,
  clearStoredSession,
  ensureDeviceSession,
  saveSession,
} from "@/services/nakama/sessionService";

export interface EmailAuthInput {
  email: string;
  password: string;
}

export interface SignupEmailAuthInput extends EmailAuthInput {
  username: string;
}

export async function signupWithEmail(input: SignupEmailAuthInput): Promise<Session> {
  const client = getNakamaClient();
  const session = await client.authenticateEmail(
    input.email.trim(),
    input.password,
    true,
    input.username.trim()
  );
  saveSession(session);
  return session;
}

export async function loginWithEmail(input: EmailAuthInput): Promise<Session> {
  const client = getNakamaClient();
  const session = await client.authenticateEmail(input.email.trim(), input.password, false);
  saveSession(session);
  return session;
}

export async function loginAsGuest(displayName: string): Promise<Session> {
  return ensureDeviceSession(displayName);
}

export function logoutFromFrontend(): void {
  clearStoredSession();
  clearLocalDeviceId();
}
