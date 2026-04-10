import type { MatchData, Session, Socket } from "@heroiclabs/nakama-js";
import { getNakamaClient } from "@/services/nakama/nakamaClient";
import { nakamaConfig } from "@/services/nakama/nakamaConfig";

export type MatchSocketHandlers = {
  onMatchData?: (data: MatchData) => void;
  onDisconnect?: (evt: Event) => void;
};

let singletonSocket: Socket | null = null;
let isConnected = false;
let joinedMatchId: string | null = null;
let activeHandlers: MatchSocketHandlers = {};
let lastMatchDataLogAt = 0;

/** Hard reset - creates a fresh socket instance. Call this when leaving matches or on errors. */
export function resetMatchSocket(): void {
  try {
    if (singletonSocket && isConnected && joinedMatchId) {
      void singletonSocket.leaveMatch(joinedMatchId);
    }
    if (singletonSocket && isConnected) {
      singletonSocket.disconnect(true);
    }
  } catch {
    /* ignore */
  } finally {
    singletonSocket = null;
    isConnected = false;
    joinedMatchId = null;
    activeHandlers = {};
    lastMatchDataLogAt = 0;
  }
}

function getOrCreateSocket(): Socket {
  if (singletonSocket) return singletonSocket;
  const client = getNakamaClient();
  singletonSocket = client.createSocket(nakamaConfig.useSSL);
  return singletonSocket;
}

function attachSafeHandlers(socket: Socket): void {
  socket.onmatchdata = (data: MatchData) => {
    try {
      const now = Date.now();
      if (now - lastMatchDataLogAt >= 2000) {
        lastMatchDataLogAt = now;
      }
      activeHandlers.onMatchData?.(data);
    } catch (error) {
    }
  };

  socket.ondisconnect = (evt: Event) => {
    try {
      isConnected = false;
      joinedMatchId = null;
      activeHandlers.onDisconnect?.(evt);
    } catch (error) {
    }
  };
}

export async function connectAuthoritativeMatch(
  session: Session,
  matchId: string,
  handlers: MatchSocketHandlers = {}
): Promise<{ socket: Socket; disconnect: () => void }> {
  // CRITICAL: Always reset socket before connecting to ensure clean state
  resetMatchSocket();

  const socket = getOrCreateSocket();
  activeHandlers = handlers;
  attachSafeHandlers(socket);

  if (!isConnected) {
    await socket.connect(session, false);
    isConnected = true;
  }

  if (joinedMatchId && joinedMatchId !== matchId) {
    try {
      await singletonSocket.leaveMatch(joinedMatchId);
    } catch (e) {
      console.warn("[socket] leaveMatch previous failed", e);
    }
    joinedMatchId = null;
  }

  if (joinedMatchId !== matchId) {
    await socket.joinMatch(matchId, undefined, {});
    joinedMatchId = matchId;
  }

  const disconnect = () => {
    resetMatchSocket();
  };

  return { socket, disconnect };
}

