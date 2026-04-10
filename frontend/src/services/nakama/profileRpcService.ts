import type { Session } from "@heroiclabs/nakama-js";
import { RPC_IDS } from "@/constants/rpcConst";
import { getNakamaClient } from "@/services/nakama/nakamaClient";

export type ProfileRpcData = {
  userId: string;
  username: string;
};

export type ProfileRpcResult = {
  ok: boolean;
  data: ProfileRpcData | null;
  error: string | null;
};

function parsePayload(raw: unknown): unknown {
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

export async function rpcGetProfile(session: Session): Promise<ProfileRpcResult> {
  const client = getNakamaClient();
  const res = await client.rpc(session, RPC_IDS.GET_PROFILE, "");
  const payload = parsePayload(res.payload) as ProfileRpcResult | null;
  if (!payload || typeof payload.ok !== "boolean") {
    return { ok: false, data: null, error: "invalid_rpc_response" };
  }
  return payload;
}
