declare namespace nkruntime {
  interface Context {
    userId?: string;
    username?: string;
    sessionId?: string;
  }

  interface Logger {
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
  }

  interface MatchMessage {
    opCode: number;
    data: string;
    sender: Presence;
  }

  interface Match {
    matchId: string;
    size?: number;
  }

  interface UserRecord {
    username?: string;
  }

  interface Account {
    user?: UserRecord;
  }

  interface MatchDispatcher {
    broadcastMessage(
      opCode: number,
      data: string,
      presences?: Presence[],
      sender?: Presence | null,
      reliable?: boolean
    ): void;
  }

  interface StorageWriteObject {
    collection: string;
    key: string;
    userId: string;
    value: string;
    permissionRead?: number;
    permissionWrite?: number;
    version?: string;
  }

  interface StorageReadRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface StorageObject {
    collection: string;
    key: string;
    userId: string;
    value: string;
    version: string;
  }

  interface LeaderboardRecord {
    ownerId?: string;
    owner_id?: string;
    username?: string;
    score: string;
    subscore?: string;
    rank?: string;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
  }

  interface Nakama {
    binaryToString(data: string): string;
    matchCreate(module: string, params: Record<string, unknown>): string;
    matchGet(matchId: string): Match | null;
    accountGetId(userId: string): Account;
    storageWrite(objects: StorageWriteObject[]): void;
    storageRead(requests: StorageReadRequest[]): StorageObject[];
    leaderboardCreate(
      id: string,
      authoritative: boolean,
      sortOrder: string,
      operator: string,
      resetSchedule: string,
      metadata: Record<string, unknown>
    ): void;
    leaderboardRecordWrite(
      id: string,
      ownerId: string,
      username: string,
      score: number,
      subscore: number,
      metadata: Record<string, unknown>
    ): void;
    leaderboardRecordsList(
      id: string,
      ownerIds: string[],
      limit: number
    ): LeaderboardRecordList;
    matchList(
      limit: number,
      authoritative: boolean,
      label: string,
      minSize: number,
      maxSize: number,
      query: string
    ): Match[];
  }

  type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    payload: string
  ) => string;

  interface MatchJoinAttemptResult<TState> {
    state: TState;
    accept: boolean;
    rejectMessage?: string;
  }

  interface MatchResult<TState> {
    state: TState;
  }

  interface MatchSignalResult<TState> {
    state: TState;
    data: string;
  }

  interface MatchInitResult<TState> {
    state: TState;
    tickRate: number;
    label: string;
  }

  interface MatchHandler<TState> {
    matchInit(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      params: { [key: string]: string }
    ): MatchInitResult<TState>;
    matchJoinAttempt(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      presence: Presence,
      metadata: { [key: string]: string }
    ): MatchJoinAttemptResult<TState>;
    matchJoin(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      presences: Presence[]
    ): MatchResult<TState>;
    matchLeave(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      presences: Presence[]
    ): MatchResult<TState>;
    matchLoop(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      messages: MatchMessage[]
    ): MatchResult<TState>;
    matchTerminate(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      graceSeconds: number
    ): MatchResult<TState>;
    matchSignal(
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      tick: number,
      state: TState,
      data: string
    ): MatchSignalResult<TState>;
  }

  interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerMatch(id: string, fn: MatchHandler<unknown>): void;
  }

  type InitModule = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    initializer: Initializer
  ) => void;
}
