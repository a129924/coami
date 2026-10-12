import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

export class ClientFailure extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ClientFailure";
  }
}

export class UsageGuard {
  #now: () => number;
  #grantId: string | undefined;
  #disabledAt: number | undefined;
  #terminalReason: string | undefined;

  constructor(now: () => number = () => performance.now()) {
    this.#now = now;
  }

  authorize(grantId: string, sentAt: number, remainingMs: number): void {
    if (!grantId || !Number.isFinite(sentAt) || sentAt > this.#now()
      || !Number.isSafeInteger(remainingMs) || remainingMs < 0
      || (this.#grantId !== undefined && this.#grantId !== grantId)) {
      throw new ClientFailure("invalid_grant");
    }
    this.#grantId = grantId;
    if (this.#terminalReason !== undefined) return;
    this.#disabledAt = Math.min(this.#disabledAt ?? Infinity, sentAt + remainingMs);
    if (this.#now() >= this.#disabledAt) this.disable("expired");
  }

  disable(reason: string): void {
    this.#terminalReason ??= reason;
  }

  get grantId(): string | undefined {
    return this.#grantId;
  }

  get remainingMs(): number {
    if (this.#terminalReason !== undefined || this.#disabledAt === undefined) return 0;
    return Math.max(0, this.#disabledAt - this.#now());
  }

  get canUse(): boolean {
    if (this.#disabledAt !== undefined && this.#now() >= this.#disabledAt) {
      this.disable("expired");
    }
    return this.#disabledAt !== undefined && this.#terminalReason === undefined;
  }

  get reason(): string {
    return this.canUse ? "active" : this.#terminalReason ?? "not_started";
  }
}

export interface FrameHeader {
  v: 1;
  type: string;
  robot_id: string;
  connection_id: string;
  message_id: string;
}

interface ReplyHeader extends FrameHeader {
  reply_to: string;
}

export interface StartResult extends ReplyHeader {
  type: "robot.start_result";
  status: "Success" | "Expired";
  grant_id: string;
  authorized_at_ms: number;
  deadline_ms: number;
  server_now_ms: number;
  remaining_ms: number;
}

export interface OperationResult extends ReplyHeader {
  type: "operation.result";
  allowed: boolean;
  reason: "allowed" | "not_started" | "expired";
  grant_id: string | null;
}

export interface StateResult extends ReplyHeader {
  type: "usage.state";
  state: "not_started" | "active" | "expired";
  grant_id: string | null;
  authorized_at_ms: number | null;
  deadline_ms: number | null;
  server_now_ms: number;
  remaining_ms: number;
}

export interface ExpiredNotice extends FrameHeader {
  type: "usage.expired";
  grant_id: string;
  deadline_ms: number;
  server_now_ms: number;
}

export type Reply = StartResult | OperationResult | StateResult;
export type ServerFrame = Reply | ExpiredNotice;
type RequestType = "robot.start" | "operation.probe" | "usage.status";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    throw new ClientFailure("invalid_frame");
  }
  return value;
}

function integer(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ClientFailure("invalid_frame");
  }
  return value;
}

function nullableInteger(record: Record<string, unknown>, key: string): number | null {
  return record[key] === null ? null : integer(record, key);
}

function nullableIdentifier(record: Record<string, unknown>, key: string): string | null {
  return record[key] === null ? null : identifier(record, key);
}

export function parseServerFrame(data: unknown): ServerFrame {
  if (typeof data !== "string") throw new ClientFailure("invalid_frame");
  const value: unknown = JSON.parse(data);
  if (!isRecord(value) || value.v !== 1) throw new ClientFailure("invalid_frame");
  const header = {
    v: 1 as const,
    robot_id: identifier(value, "robot_id"),
    connection_id: identifier(value, "connection_id"),
    message_id: identifier(value, "message_id"),
  };
  switch (value.type) {
    case "robot.start_result": {
      if (value.status !== "Success" && value.status !== "Expired") {
        throw new ClientFailure("invalid_frame");
      }
      const result: StartResult = {
        ...header, type: value.type, reply_to: identifier(value, "reply_to"),
        status: value.status, grant_id: identifier(value, "grant_id"),
        authorized_at_ms: integer(value, "authorized_at_ms"),
        deadline_ms: integer(value, "deadline_ms"),
        server_now_ms: integer(value, "server_now_ms"),
        remaining_ms: integer(value, "remaining_ms"),
      };
      if (result.deadline_ms < result.authorized_at_ms
        || result.remaining_ms !== Math.max(0, result.deadline_ms - result.server_now_ms)
        || (result.status === "Success") !== (result.remaining_ms > 0)) {
        throw new ClientFailure("invalid_frame");
      }
      return result;
    }
    case "operation.result": {
      if (typeof value.allowed !== "boolean"
        || !["allowed", "not_started", "expired"].includes(String(value.reason))
        || value.allowed !== (value.reason === "allowed")) {
        throw new ClientFailure("invalid_frame");
      }
      return { ...header, type: value.type, reply_to: identifier(value, "reply_to"),
        allowed: value.allowed, reason: value.reason as OperationResult["reason"],
        grant_id: nullableIdentifier(value, "grant_id") };
    }
    case "usage.state": {
      if (value.state !== "not_started" && value.state !== "active" && value.state !== "expired") {
        throw new ClientFailure("invalid_frame");
      }
      const result: StateResult = {
        ...header, type: value.type, reply_to: identifier(value, "reply_to"),
        state: value.state, grant_id: nullableIdentifier(value, "grant_id"),
        authorized_at_ms: nullableInteger(value, "authorized_at_ms"),
        deadline_ms: nullableInteger(value, "deadline_ms"),
        server_now_ms: integer(value, "server_now_ms"), remaining_ms: integer(value, "remaining_ms"),
      };
      if (result.state === "not_started") {
        if (result.grant_id !== null || result.authorized_at_ms !== null
          || result.deadline_ms !== null || result.remaining_ms !== 0) {
          throw new ClientFailure("invalid_frame");
        }
      } else if (result.grant_id === null || result.authorized_at_ms === null
        || result.deadline_ms === null || result.deadline_ms < result.authorized_at_ms
        || result.remaining_ms !== Math.max(0, result.deadline_ms - result.server_now_ms)
        || (result.state === "active") !== (result.remaining_ms > 0)) {
        throw new ClientFailure("invalid_frame");
      }
      return result;
    }
    case "usage.expired": {
      const result: ExpiredNotice = { ...header, type: value.type,
        grant_id: identifier(value, "grant_id"), deadline_ms: integer(value, "deadline_ms"),
        server_now_ms: integer(value, "server_now_ms") };
      if ("reply_to" in value || result.server_now_ms < result.deadline_ms) {
        throw new ClientFailure("invalid_frame");
      }
      return result;
    }
    default: throw new ClientFailure("invalid_frame");
  }
}

export interface Journal {
  record(event: string, fields?: Record<string, unknown>): void;
}

const frameKeys = new Set([
  "v", "type", "robot_id", "connection_id", "message_id", "reply_to", "grant_id",
  "status", "state", "authorized_at_ms", "deadline_ms", "server_now_ms", "remaining_ms",
  "allowed", "reason",
]);

export class JsonlJournal implements Journal {
  #path: string;
  #runId: string;
  #instanceId = randomUUID();

  constructor(path: string, runId: string) {
    this.#path = path;
    this.#runId = runId;
  }

  record(event: string, fields: Record<string, unknown> = {}): void {
    const entry: Record<string, unknown> = { side: "robot", run_id: this.#runId,
      instance_id: this.#instanceId, event, utc_ms: Date.now(),
      logical_time_ms: Date.now(), time_mode: "real" };
    for (const key of ["robot_id", "connection_id", "message_id", "reply_to", "grant_id", "reason"]) {
      if (typeof fields[key] === "string") entry[key] = fields[key];
    }
    if (isRecord(fields.message)) {
      entry.message = Object.fromEntries(Object.entries(fields.message).filter(([key, value]) =>
        frameKeys.has(key) && (value === null || ["string", "boolean", "number"].includes(typeof value))));
    }
    mkdirSync(dirname(this.#path), { recursive: true });
    const descriptor = openSync(this.#path, "a", 0o600);
    try {
      const bytes = Buffer.from(`${JSON.stringify(entry)}\n`, "utf8");
      let written = 0;
      while (written < bytes.length) written += writeSync(descriptor, bytes, written, bytes.length - written);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  }
}

export type RobotSocket = Pick<WebSocket,
  "readyState" | "send" | "close" | "addEventListener" | "removeEventListener">;

interface PendingReply {
  expectedType: Reply["type"];
  sentAt: number;
  resolve: (frame: Reply) => void;
  reject: (failure: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface RobotOptions {
  url: string;
  robotId: string;
  journal: Journal;
  now?: () => number;
  requestTimeoutMs?: number;
  socketFactory?: (url: string) => RobotSocket;
  onExpired?: () => void;
  onServerExpired?: (notice: ExpiredNotice) => void;
}

export class RobotClient {
  readonly connectionId = randomUUID();
  readonly guard: UsageGuard;
  #options: RobotOptions;
  #socket: RobotSocket | undefined;
  #pending = new Map<string, PendingReply>();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #failure: string | undefined;
  #closing = false;
  #expiredNotified = false;
  #now: () => number;
  #seenMessages = new Set<string>();

  constructor(options: RobotOptions) {
    const url = new URL(options.url);
    if (url.protocol !== "ws:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.username || url.password || !/^[A-Za-z0-9._:-]{1,128}$/.test(options.robotId)) {
      throw new ClientFailure("invalid_configuration");
    }
    this.#options = options;
    this.#now = options.now ?? (() => performance.now());
    this.guard = new UsageGuard(this.#now);
  }

  get failure(): string | undefined { return this.#failure; }

  async open(): Promise<void> {
    const socket = (this.#options.socketFactory ?? ((url) => new WebSocket(url)))(this.#options.url);
    this.#socket = socket;
    socket.addEventListener("message", (event: MessageEvent) => {
      const data: unknown = event.data;
      try { this.#receive(data); } catch { this.#fail("protocol_error"); }
    });
    socket.addEventListener("error", () => this.#fail("socket_error"));
    socket.addEventListener("close", () => {
      if (this.#closing) {
        this.guard.disable("disconnected");
      } else {
        this.#fail("disconnected");
      }
    });
    if (socket.readyState === 1) return;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        socket.removeEventListener("open", opened);
        socket.removeEventListener("error", failed);
        socket.removeEventListener("close", failed);
      };
      const opened = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new ClientFailure(this.#failure ?? "connect_failed")); };
      const timer = setTimeout(() => {
        cleanup(); this.#fail("connect_timeout"); reject(new ClientFailure("connect_timeout"));
      }, this.#options.requestTimeoutMs ?? 2_000);
      socket.addEventListener("open", opened, { once: true });
      socket.addEventListener("error", failed, { once: true });
      socket.addEventListener("close", failed, { once: true });
    });
  }

  async start(): Promise<StartResult> {
    const frame = await this.#request("robot.start", "robot.start_result");
    if (frame.type !== "robot.start_result") throw new ClientFailure("protocol_error");
    return frame;
  }

  async probe(): Promise<OperationResult> {
    if (!this.guard.canUse) throw new ClientFailure(this.guard.reason);
    return this.rawProbe();
  }

  async rawProbe(): Promise<OperationResult> {
    const frame = await this.#request("operation.probe", "operation.result");
    if (frame.type !== "operation.result") throw new ClientFailure("protocol_error");
    return frame;
  }

  async status(): Promise<StateResult> {
    const frame = await this.#request("usage.status", "usage.state");
    if (frame.type !== "usage.state") throw new ClientFailure("protocol_error");
    return frame;
  }

  close(): void {
    this.#closing = true;
    this.guard.disable("disconnected");
    clearTimeout(this.#timer);
    this.#rejectPending("disconnected");
    this.#socket?.close(1000, "harness_complete");
  }

  #request(type: RequestType, expectedType: Reply["type"]): Promise<Reply> {
    if (this.#failure || this.#closing || this.#socket?.readyState !== 1) {
      return Promise.reject(new ClientFailure(this.#failure ?? "not_connected"));
    }
    const message = { v: 1 as const, type, robot_id: this.#options.robotId,
      connection_id: this.connectionId, message_id: randomUUID(),
      ...(this.guard.grantId === undefined ? {} : { grant_id: this.guard.grantId }) };
    return new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => this.#fail("request_timeout"), this.#options.requestTimeoutMs ?? 2_000);
      this.#pending.set(message.message_id, { expectedType, sentAt: this.#now(), resolve, reject, timer });
      try {
        this.#record("send_attempt", message);
      } catch {
        this.#fail("log_failed"); return;
      }
      try {
        this.#socket?.send(JSON.stringify(message));
      } catch {
        this.#fail("send_failed"); return;
      }
      try { this.#record("sent", message); } catch { this.#fail("log_failed"); }
    });
  }

  #receive(data: unknown): void {
    if (this.#closing || this.#failure) return;
    const frame = parseServerFrame(data);
    if (frame.robot_id !== this.#options.robotId || frame.connection_id !== this.connectionId
      || this.#seenMessages.has(frame.message_id)) throw new ClientFailure("protocol_error");
    this.#seenMessages.add(frame.message_id);
    try { this.#record("received", frame); } catch { this.#fail("log_failed"); return; }
    if (frame.type === "usage.expired") {
      if (frame.grant_id !== this.guard.grantId) throw new ClientFailure("protocol_error");
      this.#expire(); this.#options.onServerExpired?.(frame); return;
    }
    const pending = this.#pending.get(frame.reply_to);
    if (!pending || frame.type !== pending.expectedType) throw new ClientFailure("protocol_error");
    if (frame.type === "robot.start_result") {
      this.guard.authorize(frame.grant_id, pending.sentAt, frame.remaining_ms);
      if (frame.status === "Expired" || !this.guard.canUse) this.#expire();
      else this.#scheduleExpiry();
    } else if (frame.grant_id !== (this.guard.grantId ?? null)) {
      throw new ClientFailure("protocol_error");
    } else if ((frame.type === "operation.result" && frame.reason === "expired")
      || (frame.type === "usage.state" && frame.state === "expired")) {
      this.#expire();
    }
    clearTimeout(pending.timer);
    this.#pending.delete(frame.reply_to);
    pending.resolve(frame);
  }

  #scheduleExpiry(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      if (!this.guard.canUse) this.#expire();
      else this.#scheduleExpiry();
    }, Math.min(Math.ceil(this.guard.remainingMs), 2_147_483_647));
  }

  #expire(): void {
    this.guard.disable("expired");
    clearTimeout(this.#timer);
    if (this.#expiredNotified) return;
    this.#expiredNotified = true;
    try {
      this.#options.journal.record("usage_disabled", { robot_id: this.#options.robotId,
        connection_id: this.connectionId, grant_id: this.guard.grantId, reason: "expired" });
      this.#options.onExpired?.();
    } catch { this.#fail("log_failed"); }
  }

  #record(event: string, message: FrameHeader): void {
    this.#options.journal.record(event, { robot_id: message.robot_id,
      connection_id: message.connection_id, message_id: message.message_id,
      ...("grant_id" in message ? { grant_id: message.grant_id } : {}), message });
  }

  #rejectPending(reason: string): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer); pending.reject(new ClientFailure(reason));
    }
    this.#pending.clear();
  }

  #fail(reason: string): void {
    if (this.#failure || this.#closing) return;
    this.#failure = reason;
    this.guard.disable(reason);
    clearTimeout(this.#timer);
    try {
      this.#options.journal.record("failure", { robot_id: this.#options.robotId,
        connection_id: this.connectionId, reason });
    } catch { this.#failure = "log_failed"; }
    this.#rejectPending(this.#failure);
    try { this.#socket?.close(1008, "client_disabled"); } catch { this.#failure = "close_failed"; }
  }
}

function ipc(message: Record<string, unknown>): void {
  if (process.send) process.send(message);
  else console.log(JSON.stringify(message));
}

async function main(): Promise<void> {
  const journal = new JsonlJournal(process.env.ROBOT_LOG ?? "evidence/robot.jsonl", process.env.RUN_ID ?? randomUUID());
  const client = new RobotClient({ url: process.env.SERVER_URL ?? "ws://127.0.0.1:8000/ws",
    robotId: process.env.ROBOT_ID ?? "e014-robot", journal,
    onExpired: () => ipc({ kind: "expired", enabled: false }),
    onServerExpired: (notice) => ipc({ kind: "server_expired", notice, enabled: false }) });
  const shutdown = () => client.close();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  try {
    await client.open();
    const reply = await client.start();
    ipc({ kind: "ready", reply, connection_id: client.connectionId, enabled: client.guard.canUse });
  } catch {
    client.close(); process.exitCode = 1; ipc({ kind: "failure", reason: "startup_failed" }); return;
  }
  process.on("message", (value: unknown) => {
    if (!isRecord(value) || typeof value.command_id !== "string") return;
    const commandId = value.command_id;
    if (value.command === "close") { client.close(); process.disconnect?.(); return; }
    const action = value.command === "probe" ? client.probe()
      : value.command === "raw_probe" ? client.rawProbe()
        : value.command === "status" ? client.status()
          : Promise.reject(new ClientFailure("invalid_command"));
    void action.then((reply) => ipc({ kind: "result", command_id: commandId, reply,
      enabled: client.guard.canUse, connection_id: client.connectionId }))
      .catch((error: unknown) => ipc({ kind: "result", command_id: commandId,
        error: error instanceof ClientFailure ? error.message : "command_failed", enabled: client.guard.canUse }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => { process.exitCode = 1; ipc({ kind: "failure", reason: "robot_failed" }); });
}
