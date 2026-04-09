/**
 * Must stay in sync with `nakama/modules/shared/protocol.ts`.
 */
export const OPCODES = {
  MOVE: 1,
  STATE_UPDATE: 2,
} as const;

export type MovePayload = {
  position: number;
};
