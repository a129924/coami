import assert from "node:assert/strict";
import test from "node:test";
import { ClientFailure, RobotClient, UsageGuard, parseServerFrame } from "./robot.ts";
import type { Journal, RobotSocket } from "./robot.ts";

test("startup is disabled until a grant is received", () => {
  const guard = new UsageGuard(() => 100);
  assert.equal(guard.canUse, false);
});

test("response latency is included conservatively and old grants never revive expiry", () => {
  let now = 100;
  const guard = new UsageGuard(() => now);
  now = 900;
  guard.authorize("grant-1", 100, 1_000);
  now = 1_100;
  assert.equal(guard.canUse, false);
  guard.authorize("grant-1", 1_100, 50_000);
  assert.equal(guard.canUse, false);
});

test("repeated grants cannot extend the existing local deadline", () => {
  let now = 0;
  const guard = new UsageGuard(() => now);
  guard.authorize("grant-1", 0, 100);
  now = 10;
  guard.authorize("grant-1", 10, 100);
  now = 100;
  assert.equal(guard.canUse, false);
});

test("disconnect and expiry notifications fail closed", () => {
  for (const reason of ["expired", "disconnected", "protocol_error", "log_failed"]) {
    const guard = new UsageGuard(() => 0);
    guard.authorize("grant-1", 0, 100);
    guard.disable(reason);
    guard.authorize("grant-1", 0, 1_000);
    assert.equal(guard.canUse, false);
    assert.equal(guard.reason, reason);
  }
});

test("invalid grant values and changed identity are rejected", () => {
  const guard = new UsageGuard(() => 0);
  for (const remaining of [-1, NaN, Infinity, 0.5]) {
    assert.throws(() => guard.authorize("grant-1", 0, remaining), ClientFailure);
  }
  guard.authorize("grant-1", 0, 100);
  assert.throws(() => guard.authorize("grant-2", 0, 100), ClientFailure);
});

class FakeSocket extends EventTarget {
  readyState = 1;
  sent: Record<string, unknown>[] = [];
  failSend = false;

  send(data: string): void {
    if (this.failSend) throw new Error("injected_send_failure");
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }

  close(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  receive(value: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(value) }));
  }
}

class MemoryJournal implements Journal {
  events: string[] = [];
  fail = false;
  record(event: string): void {
    if (this.fail) throw new Error("injected_log_failure");
    this.events.push(event);
  }
}

function fixture() {
  const socket = new FakeSocket();
  const journal = new MemoryJournal();
  const client = new RobotClient({ url: "ws://127.0.0.1:8000/ws", robotId: "robot-test", journal,
    socketFactory: () => socket as unknown as RobotSocket, now: () => 0 });
  return { socket, journal, client };
}

function startReply(socket: FakeSocket, overrides: Record<string, unknown> = {}) {
  const request = socket.sent.at(-1);
  assert.ok(request);
  return { v: 1, type: "robot.start_result", robot_id: request.robot_id,
    connection_id: request.connection_id, message_id: "server-start", reply_to: request.message_id,
    status: "Success", grant_id: "grant-test", authorized_at_ms: 1_000,
    deadline_ms: 2_000, server_now_ms: 1_000, remaining_ms: 1_000, ...overrides };
}

test("matched startup grants enable the client and expiry leaves the socket open", async () => {
  const { socket, client } = fixture();
  await client.open();
  const started = client.start();
  socket.receive(startReply(socket));
  assert.equal((await started).status, "Success");
  assert.equal(client.guard.canUse, true);
  socket.receive({ v: 1, type: "usage.expired", robot_id: "robot-test",
    connection_id: client.connectionId, message_id: "notice", grant_id: "grant-test",
    deadline_ms: 2_000, server_now_ms: 2_000 });
  assert.equal(client.guard.canUse, false);
  assert.equal(socket.readyState, 1);
  await assert.rejects(client.probe(), /expired/);
  const status = client.status();
  const request = socket.sent.at(-1);
  assert.ok(request);
  socket.receive({ v: 1, type: "usage.state", robot_id: "robot-test",
    connection_id: client.connectionId, message_id: "status", reply_to: request.message_id,
    state: "expired", grant_id: "grant-test", authorized_at_ms: 1_000,
    deadline_ms: 2_000, server_now_ms: 2_000, remaining_ms: 0 });
  assert.equal((await status).state, "expired");
  client.close();
});

test("wrong correlation and connection identifiers never enable startup", async () => {
  for (const overrides of [{ reply_to: "wrong" }, { connection_id: "wrong" }, { robot_id: "wrong" }]) {
    const { socket, client } = fixture();
    await client.open();
    const started = client.start();
    socket.receive(startReply(socket, overrides));
    await assert.rejects(started, /protocol_error/);
    assert.equal(client.guard.canUse, false);
    assert.equal(socket.readyState, 3);
  }
});

test("send failures and log failures cannot turn into successful requests", async () => {
  for (const failure of ["send", "log"]) {
    const { socket, journal, client } = fixture();
    await client.open();
    socket.failSend = failure === "send";
    journal.fail = failure === "log";
    await assert.rejects(client.start(), failure === "send" ? /send_failed/ : /log_failed/);
    assert.equal(client.guard.canUse, false);
    assert.equal(socket.readyState, 3);
  }
});

test("unexpected disconnect rejects a pending request", async () => {
  const { socket, client } = fixture();
  await client.open();
  const started = client.start();
  socket.close();
  await assert.rejects(started, /disconnected/);
  assert.equal(client.guard.canUse, false);
});

test("invalid server frames and inconsistent decisions are rejected", () => {
  const { socket } = fixture();
  socket.send(JSON.stringify({ robot_id: "robot-test", connection_id: "conn", message_id: "req" }));
  for (const frame of [null, { v: 2 }, startReply(socket, { status: "Success", remaining_ms: 0 }),
    startReply(socket, { remaining_ms: -1 }), startReply(socket, { deadline_ms: 999 })]) {
    assert.throws(() => parseServerFrame(JSON.stringify(frame)), ClientFailure);
  }
});

test("the exact usage deadline disables operations", () => {
  let now = 100;
  const guard = new UsageGuard(() => now);
  guard.authorize("grant-1", 100, 1_000);
  now = 1_099;
  assert.equal(guard.canUse, true);
  now = 1_100;
  assert.equal(guard.canUse, false);
});
