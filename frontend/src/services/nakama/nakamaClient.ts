import { Client } from "@heroiclabs/nakama-js";
import { nakamaConfig } from "./nakamaConfig";

let client: Client | null = null;

export function getNakamaClient(): Client {
  if (!client) {
    client = new Client(
      nakamaConfig.serverKey,
      nakamaConfig.host,
      nakamaConfig.port,
      nakamaConfig.useSSL
    );
  }
  return client;
}
