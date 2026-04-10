import type { Session } from "@heroiclabs/nakama-js";
import { RPC_IDS } from "@/constants/rpcConst";
import { getNakamaClient } from "@/services/nakama/nakamaClient";
import type {
  CreateMatchResult,
  FindMatchResult,
  GetLeaderboardResult,
  JoinMatchResult,
} from "./matchRpc.types";

function parseRpcPayload(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export type CreateMatchRpcPayload = {
  mode?: "classic" | "timed";
  /** Used when mode is `timed` (backend accepts 30 or 60). */
  moveTimeoutSec?: 30 | 60;
};

export async function rpcCreateMatch(
  session: Session,
  body: CreateMatchRpcPayload = {}
): Promise<CreateMatchResult> {
  const client = getNakamaClient();
  const rpcBody =
    body.mode === "timed"
      ? { mode: "timed", moveTimeoutSec: body.moveTimeoutSec ?? 60 }
      : { mode: body.mode ?? "classic" };
  const res = await client.rpc(session, RPC_IDS.CREATE_MATCH, rpcBody);
  const payload = parseRpcPayload(res.payload) as CreateMatchResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}

export async function rpcFindMatch(
  session: Session,
  body: CreateMatchRpcPayload = {}
): Promise<FindMatchResult> {
  const client = getNakamaClient();
  const rpcBody =
    body.mode === "timed"
      ? { mode: "timed", moveTimeoutSec: body.moveTimeoutSec ?? 60 }
      : { mode: body.mode ?? "classic" };
  const res = await client.rpc(session, RPC_IDS.FIND_MATCH, rpcBody);
  const payload = parseRpcPayload(res.payload) as FindMatchResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}

export async function rpcGetLeaderboard(session: Session): Promise<GetLeaderboardResult> {
  const client = getNakamaClient();
  const res = await client.rpc(session, RPC_IDS.GET_LEADERBOARD, {});
  const payload = parseRpcPayload(res.payload) as GetLeaderboardResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}

export async function rpcJoinMatchByCode(session: Session, roomCode: string): Promise<JoinMatchResult> {
  const client = getNakamaClient();
  const code = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const res = await client.rpc(session, RPC_IDS.JOIN_MATCH_BY_CODE, { roomCode: code });
  const payload = parseRpcPayload(res.payload) as JoinMatchResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}
