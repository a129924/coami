import assert from "node:assert/strict";
import { fork, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type RecordValue = Record<string, unknown>;
const root = fileURLToPath(new URL(".", import.meta.url));
const runId = randomUUID();
const evidence = join(root, "evidence");
const children = new Set<ChildProcess>();
const abort = new AbortController();

function recordValue(value: unknown): RecordValue {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return value as RecordValue;
}

function evidenceEvent(event: string, details: RecordValue = {}): void {
  mkdirSync(evidence, { recursive: true });
  appendFileSync(join(evidence, "smoke.jsonl"), `${JSON.stringify({ run_id: runId,
    event, utc_ms: Date.now(), time_mode: "real", ...details })}\n`);
}

function deadline<T>(promise: Promise<T>, milliseconds: number, reason: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(reason)), milliseconds);
    promise.then((value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}

async function freePort(): Promise<number> {
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  assert.ok(address !== null && typeof address !== "string");
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  try { await deadline(exited, 1_000, "cleanup_timeout"); }
  catch {
    child.kill("SIGKILL");
    await deadline(exited, 1_000, "cleanup_kill_timeout");
    evidenceEvent("cleanup_forced");
  }
}

class RobotProcess {
  readonly child: ChildProcess;
  #messages: RecordValue[] = [];
  #waiter: { predicate: (message: RecordValue) => boolean;
    resolve: (message: RecordValue) => void; reject: (reason: Error) => void } | undefined;

  constructor(url: string) {
    assert.equal(abort.signal.aborted, false);
    this.child = fork(join(root, "robot.ts"), [], { cwd: root, execArgv: [],
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      env: { ...process.env, SERVER_URL: url, ROBOT_ID: `e014-${runId}`, RUN_ID: runId,
        ROBOT_LOG: join(evidence, "robot.jsonl") } });
    children.add(this.child);
    this.child.on("message", (value: unknown) => {
      const message = recordValue(value);
      if (this.#waiter?.predicate(message)) {
        const waiter = this.#waiter;
        this.#waiter = undefined;
        waiter.resolve(message);
      } else this.#messages.push(message);
    });
    this.child.once("exit", () => {
      this.#waiter?.reject(new Error("robot_exited")); this.#waiter = undefined;
    });
    this.child.once("error", () => {
      this.#waiter?.reject(new Error("robot_process_error")); this.#waiter = undefined;
    });
    this.child.stderr?.on("data", () => undefined);
    this.child.stdout?.on("data", () => undefined);
  }

  async waitFor(predicate: (message: RecordValue) => boolean, milliseconds = 2_000): Promise<RecordValue> {
    assert.equal(this.#waiter, undefined);
    const index = this.#messages.findIndex(predicate);
    if (index >= 0) {
      const message = this.#messages.splice(index, 1)[0];
      assert.ok(message); return message;
    }
    const waiting = new Promise<RecordValue>((resolve, reject) => {
      this.#waiter = { predicate, resolve, reject };
    });
    try { return await deadline(waiting, milliseconds, "robot_message_timeout"); }
    finally { this.#waiter = undefined; }
  }

  async ready(): Promise<RecordValue> {
    const message = await this.waitFor((value) => value.kind === "ready" || value.kind === "failure");
    assert.equal(message.kind, "ready");
    return message;
  }

  async command(command: string): Promise<RecordValue> {
    const commandId = randomUUID();
    this.child.send({ command, command_id: commandId });
    return this.waitFor((message) => message.kind === "result" && message.command_id === commandId);
  }

  async close(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    const exited = new Promise<number | null>((resolve) => this.child.once("exit", resolve));
    this.child.send({ command: "close", command_id: randomUUID() });
    assert.equal(await deadline(exited, 2_000, "robot_close_timeout"), 0);
  }
}

function readJournal(name: string): RecordValue[] {
  return readFileSync(join(evidence, name), "utf8").trim().split("\n")
    .map((line) => recordValue(JSON.parse(line) as unknown)).filter((entry) => entry.run_id === runId);
}

function verifyPairing(): { pairedFrames: number; clientInstances: number } {
  const server = readJournal("server.jsonl");
  const robot = readJournal("robot.jsonl");
  assert.ok(server.length > 0 && robot.length > 0);
  for (const entry of [...server, ...robot]) {
    assert.equal(entry.time_mode, "real");
    assert.equal(typeof entry.utc_ms, "number");
  }
  const sentServer = server.filter((entry) => entry.event === "sent");
  const sentRobot = robot.filter((entry) => entry.event === "sent");
  const receivedServer = server.filter((entry) => entry.event === "received");
  const receivedRobot = robot.filter((entry) => entry.event === "received");
  for (const [sent, received] of [[sentServer, receivedRobot], [sentRobot, receivedServer]]) {
    assert.ok(sent && received);
    assert.equal(sent.length, received.length);
    for (const entry of sent) {
      const counterpart: RecordValue[] = received.filter((other) => other.message_id === entry.message_id);
      assert.equal(counterpart.length, 1);
      assert.deepEqual(counterpart[0]?.message, entry.message);
    }
  }
  const instances = new Set(robot.map((entry) => entry.instance_id));
  assert.equal(instances.size, 3);
  const notices = sentServer.filter((entry) => recordValue(entry.message).type === "usage.expired");
  assert.equal(notices.length, 2);
  assert.equal(new Set(notices.map((entry) => entry.connection_id)).size, notices.length);
  assert.equal(/"(?:authorization|password|secret|api_key|headers)"/i.test(JSON.stringify([...server, ...robot])), false);
  return { pairedFrames: sentServer.length + sentRobot.length, clientInstances: instances.size };
}

async function run(): Promise<void> {
  assert.match(process.versions.node, /^24\./, "smoke_requires_node24");
  evidenceEvent("started", { node: process.versions.node, usage_ms: 5_000 });
  const port = await freePort();
  const server = spawn(join(root, ".venv/bin/python"), ["-m", "uvicorn", "app:app",
    "--host", "127.0.0.1", "--port", String(port), "--no-access-log"], { cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, USAGE_MS: "5000", RUN_ID: runId, PYTHONUNBUFFERED: "1",
      SERVER_LOG: join(evidence, "server.jsonl") } });
  children.add(server);
  server.stdout?.on("data", () => undefined);
  let shutdownComplete = false;
  let serverFailure = false;
  let serverOutput = "";
  await deadline(new Promise<void>((resolve, reject) => {
    server.stderr?.on("data", (bytes: Buffer) => {
      serverOutput = (serverOutput + bytes.toString()).slice(-65_536);
      if (serverOutput.includes("Application shutdown complete")) shutdownComplete = true;
      if (serverOutput.includes("ERROR:") || serverOutput.includes("Traceback")) serverFailure = true;
      if (serverOutput.includes("Uvicorn running on")) resolve();
    });
    server.once("error", () => reject(new Error("server_start_failed")));
    server.once("exit", () => reject(new Error("server_exited")));
  }), 5_000, "server_start_timeout");
  const url = `ws://127.0.0.1:${port}/ws`;
  const first = new RobotProcess(url);
  const firstReady = await first.ready();
  const grant = recordValue(firstReady.reply);
  assert.equal(grant.status, "Success");
  assert.equal(firstReady.enabled, true);
  const firstProbe = recordValue((await first.command("probe")).reply);
  assert.equal(firstProbe.allowed, true);
  evidenceEvent("initial_grant", { grant_id: grant.grant_id, deadline_ms: grant.deadline_ms,
    connection_id: firstReady.connection_id });
  await first.close();

  const second = new RobotProcess(url);
  const secondReady = await second.ready();
  const resumed = recordValue(secondReady.reply);
  assert.equal(resumed.status, "Success");
  assert.equal(resumed.grant_id, grant.grant_id);
  assert.equal(resumed.authorized_at_ms, grant.authorized_at_ms);
  assert.equal(resumed.deadline_ms, grant.deadline_ms);
  assert.notEqual(secondReady.connection_id, firstReady.connection_id);
  assert.equal(recordValue((await second.command("probe")).reply).allowed, true);
  evidenceEvent("restart_preserved_grant", { grant_id: resumed.grant_id,
    deadline_ms: resumed.deadline_ms, connection_id: secondReady.connection_id });

  const remaining = Number(resumed.remaining_ms);
  assert.ok(remaining > 0 && remaining <= 5_000);
  const serverExpiry = await second.waitFor((message) => message.kind === "server_expired", remaining + 2_000);
  assert.equal(recordValue(serverExpiry.notice).connection_id, secondReady.connection_id);
  assert.equal(serverExpiry.enabled, false);
  const localDenied = await second.command("probe");
  assert.equal(localDenied.error, "expired");
  assert.equal(localDenied.enabled, false);
  const denied = await second.command("raw_probe");
  assert.equal(recordValue(denied.reply).allowed, false);
  assert.equal(recordValue(denied.reply).reason, "expired");
  const status = await second.command("status");
  assert.equal(recordValue(status.reply).state, "expired");
  assert.equal(status.connection_id, secondReady.connection_id);
  evidenceEvent("expired_socket_still_usable_for_status", { connection_id: status.connection_id,
    grant_id: resumed.grant_id, local_denied: true, server_denied: true });
  await second.close();

  const third = new RobotProcess(url);
  const thirdReady = await third.ready();
  const expiredGrant = recordValue(thirdReady.reply);
  assert.equal(expiredGrant.status, "Expired");
  assert.equal(expiredGrant.grant_id, grant.grant_id);
  assert.equal(expiredGrant.deadline_ms, grant.deadline_ms);
  assert.equal(thirdReady.enabled, false);
  await third.waitFor((message) => message.kind === "server_expired");
  assert.equal(recordValue((await third.command("status")).reply).state, "expired");
  await third.close();
  await stopChild(server);
  assert.equal(shutdownComplete, true);
  assert.equal(serverFailure, false);
  assert.ok(server.exitCode === 0 || server.signalCode === "SIGTERM");
  evidenceEvent("server_graceful_shutdown", { exit_code: server.exitCode, signal: server.signalCode });
  const pairing = verifyPairing();
  evidenceEvent("passed", { ...pairing, grant_id: grant.grant_id, deadline_ms: grant.deadline_ms });
  console.log(JSON.stringify({ result: "PASS", run_id: runId, node: process.versions.node,
    usage_ms: 5_000, ...pairing, expiry_kept_connection: true, restart_did_not_renew: true }));
}

const watchdog = setTimeout(() => abort.abort(new Error("smoke_watchdog_timeout")), 30_000);
try {
  await Promise.race([run(), new Promise<never>((_resolve, reject) => {
    abort.signal.addEventListener("abort", () => reject(abort.signal.reason), { once: true });
  })]);
} catch (error: unknown) {
  evidenceEvent("failed", { reason: error instanceof Error ? error.message : "smoke_failed" });
  console.error(error);
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  for (const child of children) await stopChild(child);
}
