import type { Session } from "@heroiclabs/nakama-js";
import { RPC_IDS } from "@/constants/rpcConst";
import { getNakamaClient } from "@/services/nakama/nakamaClient";
import type { CreateMatchResult, JoinMatchResult } from "./matchRpc.types";

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

export async function rpcCreateMatch(session: Session): Promise<CreateMatchResult> {
  const client = getNakamaClient();
  const res = await client.rpc(session, RPC_IDS.CREATE_MATCH, {});
  const payload = parseRpcPayload(res.payload) as CreateMatchResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}

export async function rpcJoinMatch(session: Session, matchId: string): Promise<JoinMatchResult> {
  const client = getNakamaClient();
  const res = await client.rpc(session, RPC_IDS.JOIN_MATCH, { matchId: matchId.trim() });
  const payload = parseRpcPayload(res.payload) as JoinMatchResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}
