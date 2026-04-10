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
    console.log("[socket] hard reset complete");
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
        console.log("[socket] match data stream active", { opCode: data.op_code });
        lastMatchDataLogAt = now;
      }
      activeHandlers.onMatchData?.(data);
    } catch (error) {
      console.error("[socket] onmatchdata handler crashed", error);
    }
  };

  socket.ondisconnect = (evt: Event) => {
    try {
      isConnected = false;
      joinedMatchId = null;
      console.log("[socket] disconnected");
      activeHandlers.onDisconnect?.(evt);
    } catch (error) {
      console.error("[socket] ondisconnect handler crashed", error);
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
    console.log("[socket] connecting");
    await socket.connect(session, false);
    isConnected = true;
    console.log("[socket] connected");
  }

  if (joinedMatchId && joinedMatchId !== matchId) {
    console.log("[socket] leaving previous match before join", { previous: joinedMatchId, next: matchId });
    try {
      await singletonSocket.leaveMatch(joinedMatchId);
    } catch (e) {
      console.warn("[socket] leaveMatch previous failed", e);
    }
    joinedMatchId = null;
  }

  if (joinedMatchId !== matchId) {
    console.log("[socket] joining match", { matchId });
    await socket.joinMatch(matchId, undefined, {});
    joinedMatchId = matchId;
    console.log("[socket] joined match", { matchId });
  }

  const disconnect = () => {
    console.log("[socket] disconnect requested");
    resetMatchSocket();
  };

  return { socket, disconnect };
}

