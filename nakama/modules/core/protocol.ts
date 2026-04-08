export const OPCODES = {
  MOVE: 1,
  STATE_UPDATE: 2,
} as const;

export type MovePayload = {
  position: number;
};
