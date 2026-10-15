import './style.css';
import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs';
import type { Object3D, Vector3 } from 'three';
import { CASES, centered, fixedTarget, observe, oscillating, poseError } from './observer.ts';
import { CommandGate, parseCommand, transmitFrame } from './receiver.ts';
import { encodeFrame } from '../../mod/protocol.ts';
declare const __MOD_SHA256__: string;
interface Engine {
    start(): Promise<void>;
    dispose(): void;
    pushButton(button: 'a' | 'b'): void;
    scene: {
        headGroup: Object3D;
        camera: {
            position: Vector3;
        };
        controls: {
            target: Vector3;
            update(): void;
        };
        setViewportControlsEnabled(value: boolean): void;
    };
    wasmView: {
        touchScreenPoint(kind: number, index: number, x: number, y: number, when: number): void;
    };
}
type Event = Record<string, unknown>;
const get = <T extends HTMLElement>(id: string): T => { const node = document.getElementById(id); if (!node)
    throw Error(id); return node as T; };
const status = get('status'), log = get('log'), runButton = get<HTMLButtonElement>('run'), selection = get<HTMLSelectElement>('cases');
const index = Number(new URL(location.href).searchParams.get('case') ?? 0);
const current = CASES[index] ?? CASES[0]!, runId = crypto.randomUUID();
const records: Event[] = [], gate = new CommandGate(runId);
let engine: Engine | null = null, socket: WebSocket | null = null, seq = 0, ready = false, modReady = false, hostReady = false, active = false, blocked = false;
let provenance: unknown = null, result: Event = { state: '未執行' }, traceFault: string | null = null;
let traceWait: {
    accept: (event: Event) => boolean;
    resolve: (event: Event) => void;
    reject: (error: Error) => void;
} | null = null;
let rpcWait: {
    resolve: (event: Event) => void;
    reject: (error: Error) => void;
} | null = null;
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
function record(event: Event): void { records.push({ browser_ms: performance.now(), ...event }); log.textContent = records.slice(-40).map(e => JSON.stringify(e)).join('\n'); }
function fail(error: unknown): void { blocked = true; ready = false; active = false; runButton.disabled = true; result = { state: '無法判定', reason: String(error) }; status.textContent = `無法判定：${String(error)}`; record({ kind: 'stop', ...result }); socket?.close(); }
function snapshot(): Event { return { experiment: 'E023', run_id: runId, case: current, provenance, result, records, userAgent: navigator.userAgent, capturedAt: new Date().toISOString(), poseSource: 'rendered-head-world-quaternion', limitations: 'synthetic ideal zero-offset camera; not physical robot evidence' }; }
// Read-only automation interface; executing remains via the UI.
Object.defineProperty(window, 'e023Evidence', { get: snapshot });
function traceEvent(text: string): void {
    record({ kind: 'trace', text });
    if (/\[MotionController\].*failed/.test(text)) {
        traceFault = text;
        traceWait?.reject(Error(text));
        if (active)
            fail(Error(text));
    }
    const marker = text.indexOf('COAMI23|');
    if (marker < 0)
        return;
    try {
        const parsed: unknown = JSON.parse(text.slice(marker + 8).trim());
        if (!parsed || typeof parsed !== 'object')
            throw Error('invalid trace');
        const event = parsed as Event;
        if (event.phase === 'ready') {
            modReady = true;
            enable();
        }
        if (traceWait?.accept(event))
            traceWait.resolve(event);
    }
    catch (error) {
        if (active)
            fail(error);
    }
}
function enable(): void { ready = modReady && hostReady && !blocked; runButton.disabled = !ready; status.textContent = ready ? `${current.id} 已就緒；尚未執行` : status.textContent; }
function waitTrace(accept: (event: Event) => boolean, timeout: number): Promise<Event> {
    if (traceWait)
        throw Error('trace already pending');
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { traceWait = null; reject(Error('MOD trace timeout')); }, timeout);
        const finish = (event: Event): void => { clearTimeout(timer); traceWait = null; resolve(event); };
        traceWait = { accept, resolve: finish, reject: error => { clearTimeout(timer); traceWait = null; reject(error); } };
    });
}
async function rpc(message: Event): Promise<Event> {
    if (!socket || socket.readyState !== WebSocket.OPEN || rpcWait)
        throw Error('WebSocket unavailable or pending');
    const response = new Promise<Event>((resolve, reject) => {
        const timer = setTimeout(() => { rpcWait = null; reject(Error('Server reply timeout')); }, 2000);
        rpcWait = { resolve: event => { clearTimeout(timer); rpcWait = null; record({ kind: 'server', reply: event }); resolve(event); }, reject: error => { clearTimeout(timer); rpcWait = null; reject(error); } };
    });
    socket.send(JSON.stringify(message));
    record({ kind: 'sent', message });
    return response;
}
async function connect(): Promise<void> {
    socket = new WebSocket('ws://127.0.0.1:8230/observe');
    await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(Error('Server connection timeout')), 2000); socket!.onopen = () => { clearTimeout(timer); resolve(); }; socket!.onerror = () => { clearTimeout(timer); reject(Error('Server connection failed')); }; });
    socket.onmessage = message => { try {
        const value: unknown = JSON.parse(String(message.data));
        if (!value || typeof value !== 'object' || !rpcWait)
            throw Error('unexpected server reply');
        rpcWait.resolve(value as Event);
    }
    catch (error) {
        rpcWait?.reject(Error(String(error)));
        fail(error);
    } };
    socket.onclose = () => { rpcWait?.reject(Error('Server disconnected')); if (active)
        fail(Error('Server disconnected')); };
    const hello = await rpc({ kind: 'hello', run_id: runId });
    if (hello.kind !== 'hello' || hello.run_id !== runId)
        throw Error('invalid hello');
}
async function sendFrame(target: readonly number[], probe: boolean, commandSeq: number): Promise<Event> {
    if (!engine)
        throw Error('missing engine');
    const expected = target.map(v => Math.floor((v + 1) * 1000 + 0.5) / 1000 - 1);
    const promise = waitTrace(event => {
        if (event.phase !== 'probe' && event.phase !== 'returned' && event.phase !== 'failed')
            return false;
        if (event.seq !== commandSeq)
            throw Error('wrong trace sequence');
        if (event.phase !== 'failed' && (!Array.isArray(event.target) || event.target.length !== 3 || event.target.some((v, i) => v !== expected[i])))
            throw Error('incomplete or wrong decoded payload');
        if (probe && event.phase !== 'probe')
            throw Error('probe reached motion path');
        if (!probe && event.phase === 'probe')
            throw Error('motion reached probe path');
        return true;
    }, 2000);
    try {
        const points = encodeFrame(commandSeq, target, probe);
        transmitFrame(points, (kind, x, y, when) => engine!.wasmView.touchScreenPoint(kind, 0, x, y, when), () => !traceFault && (probe || gate.canCommit(performance.now())), () => performance.now());
        record({ kind: 'frame-committed', seq: commandSeq, probe, expected });
    }
    catch (error) {
        traceWait?.reject(Error(String(error)));
    }
    return promise;
}
async function initialize(): Promise<void> {
    if (!engine)
        throw Error('missing engine');
    for (let i = 0; i < current.initial; i++) {
        const selected = waitTrace(e => e.phase === 'initial-selected' && e.initial === i + 1, 2000);
        engine.pushButton('a');
        await selected;
    }
    const initialized = waitTrace(e => e.phase === 'initialized' || e.phase === 'init-failed', 2000);
    engine.pushButton('b');
    if ((await initialized).phase !== 'initialized')
        throw Error('initial pose failed');
    const yaw = current.initial === 1 ? 20 : current.initial === 2 ? -20 : 0, pitch = yaw / 2;
    const until = performance.now() + 5000;
    while (performance.now() < until) {
        await delay(250);
        const error = poseError(engine.scene.headGroup, yaw * Math.PI / 180, pitch * Math.PI / 180);
        record({ kind: 'initial-pose', error_radians: error });
        if (error <= Math.PI / 180)
            return;
    }
    throw Error('initial rendered pose not reached within 5s');
}
async function run(): Promise<void> {
    if (!ready || active || !engine)
        return;
    active = true;
    runButton.disabled = true;
    result = { state: '未執行', stage: 'probe' };
    try {
        await connect();
        for (const target of [[1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [.781, -.625, 0], [.994, -.109, 0]]) {
            const response = await sendFrame(target, true, ++seq);
            if (response.phase !== 'probe')
                throw Error('probe failed');
        }
        record({ kind: 'probe-passed' });
        await initialize();
        const target = fixedTarget(engine.scene.headGroup, current.offset), history: number[][] = [];
        record({ kind: 'fixed-world-target', target });
        let controls = 0, stable = 0;
        while (active) {
            if (traceFault)
                throw Error(traceFault);
            const sample = observe(engine.scene.headGroup, target), created = performance.now(), observationSeq = ++seq;
            record({ kind: 'decision-observation', observation_seq: observationSeq, ...sample });
            if (sample.offset === null) {
                result = { state: '失敗', reason: 'target_left_view', controls };
                break;
            }
            history.push([...sample.offset]);
            if (oscillating(history)) {
                result = { state: '失敗', reason: 'persistent_oscillation', controls };
                break;
            }
            gate.observe(observationSeq, created);
            const reply = await rpc({ kind: 'observation', run_id: runId, observation_seq: observationSeq, offset: sample.offset, rotation: sample.rotation, age_ms: performance.now() - created });
            if (centered(sample.offset)) {
                if (reply.kind !== 'centered')
                    throw Error('center unexpectedly produced command');
                if (++stable === 3) {
                    result = { state: '成功', controls };
                    break;
                }
                await delay(250);
                continue;
            }
            stable = 0;
            if (controls >= 20) {
                if (reply.reason !== 'iteration_limit')
                    throw Error('server budget mismatch');
                result = { state: '失敗', reason: 'iteration_limit', controls };
                break;
            }
            const command = parseCommand(reply);
            if (!gate.begin(command, performance.now()))
                throw Error('command rejected by freshness/identity gate');
            const returned = await sendFrame(command.target, false, command.observation_seq);
            controls++;
            if (returned.phase === 'failed') {
                result = { state: '失敗', reason: 'sdk_failed', controls };
                break;
            }
            const end = performance.now() + 5000;
            do {
                await delay(250);
                if (!active)
                    return;
                const fresh = observe(engine.scene.headGroup, target);
                record({ kind: 'window-observation', command_id: command.command_id, ...fresh });
                if (fresh.offset === null) {
                    result = { state: '失敗', reason: 'target_left_view', controls };
                    break;
                }
            } while (performance.now() < end);
            if (result.state === '失敗')
                break;
            const completed = await rpc({ kind: 'completed', command_id: command.command_id });
            if (completed.kind !== 'completed' || completed.command_id !== command.command_id)
                throw Error('completion correlation failed');
            gate.abort();
        }
        if (!active)
            return;
        active = false;
        ready = false;
        socket?.close();
        record({ kind: 'result', ...result });
        status.textContent = `${current.id}：${result.state} ${result.reason ?? ''}（下載證據；下一案須重新載入）`;
    }
    catch (error) {
        fail(error);
    }
}
async function sha(bytes: ArrayBuffer): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join(''); }
async function boot(): Promise<void> {
    try {
        const response = await fetch('/runtime-provenance.json', { cache: 'no-store' });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
            throw Error('pinned runtime unavailable; run prepare:poc with exact E023_RUNTIME_DIR');
        const p = await response.json() as {
            experiment: string;
            sourceCommit: string;
            hashes: Record<string, string>;
        };
        provenance = p;
        if (p.experiment !== 'E023' || p.sourceCommit !== 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322')
            throw Error('runtime provenance mismatch');
        const pins = { 'mc.js': '9e7c0128e4b94ac78cb3646a488a04be227272e61b7fee77cd2b6ec91aa745f0', 'mc.wasm': 'bc8f5a40fe4e6e1b0f0fd9f29cf5089129fdfca2b9cc0ce229f6788328676ac2', 'assets/case/v1/shell.stl': '832ced3ad3669c3fc6b174a984cc800522ca33cecd9222d531bda430f6cc5236' };
        for (const [file, expected] of Object.entries(pins)) {
            const r = await fetch(`/simulator/${file}`, { cache: 'no-store' });
            if (!r.ok || p.hashes[file] !== expected || await sha(await r.arrayBuffer()) !== expected)
                throw Error(`${file}: pin mismatch`);
        }
        const mod = await fetch('/coami-mod.xsa', { cache: 'no-store' });
        if (!mod.ok)
            throw Error('MOD unavailable');
        const bytes = new Uint8Array(await mod.arrayBuffer());
        if (!__MOD_SHA256__ || p.hashes['coami-mod.xsa'] !== __MOD_SHA256__ || await sha(bytes.buffer) !== __MOD_SHA256__)
            throw Error('MOD archive mismatch');
        const installed = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const };
        engine = new SimulatorEngine({ viewport: get<HTMLCanvasElement>('viewport'), screen: get<HTMLCanvasElement>('screen'), runtimeBaseUrl: new URL('/simulator/', location.href).href, modStorage: { async loadInstalledMod() { return installed; }, async saveInstalledMod(mod: typeof installed) { return mod; }, async clearInstalledMod() { } }, onTrace: traceEvent, onReady: ({ installationStatus }: {
                installationStatus: string;
            }) => { if (!['prepared', 'installed'].includes(installationStatus)) {
                fail(Error('MOD install failed'));
                return;
            } hostReady = true; enable(); }, onError: fail }) as unknown as Engine;
        engine.scene.camera.position.set(0, 0, 200);
        engine.scene.controls.target.set(0, 0, 0);
        engine.scene.controls.update();
        engine.scene.setViewportControlsEnabled(false);
        await engine.start();
        const until = performance.now() + 30000;
        while (!ready && performance.now() < until)
            await delay(100);
        if (!ready)
            throw Error('runtime/MOD ready timeout');
    }
    catch (error) {
        fail(error);
    }
}
for (const [i, c] of CASES.entries()) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${c.id} offset=${c.offset} initial=${c.initial}`;
    selection.append(option);
}
selection.value = String(index >= 0 && index < CASES.length ? index : 0);
get('load').onclick = () => { const url = new URL(location.href); url.searchParams.set('case', selection.value); location.href = url.href; };
runButton.onclick = () => { void run(); };
get('download').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `E023-${current.id}-${runId}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
window.addEventListener('pagehide', () => { active = false; socket?.close(); engine?.dispose(); }, { once: true });
void boot();
