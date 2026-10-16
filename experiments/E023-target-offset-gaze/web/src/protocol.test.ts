import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeFrame, FrameDecoder } from '../../mod/protocol.ts';
import { CommandGate, parseCommand } from './receiver.ts';
const point = [0.7808688094, -0.6246950476, 0] as const;
const command = { kind: 'command', run_id: 'test', command_id: 'test:1', observation_seq: 1, target: point, valid_for_ms: 1000 };
test('all axes, signed and near center roundtrip without motion', () => {
    for (const target of [[1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], point, [0.994, -0.109, 0]]) {
        const decoder = new FrameDecoder();
        let result = null;
        for (const event of encodeFrame(9, target, true))
            result = decoder.receive(event.x, event.y, 100) ?? result;
        assert.equal(result?.probe, true);
        assert.equal(result?.seq, 9);
        assert.deepEqual(result?.target, target.map(v => Math.floor((v + 1) * 1000 + 0.5) / 1000 - 1));
    }
});
test('malformed, replay, reordered and timed out frames never commit', () => {
    const frame = encodeFrame(4, point, false);
    const decoder = new FrameDecoder();
    assert.equal(decoder.receive(frame[1]!.x, frame[1]!.y, 0), null);
    for (const event of frame)
        decoder.receive(event.x, event.y, 0);
    for (const event of frame)
        assert.equal(decoder.receive(event.x, event.y, 1), null);
    const timeout = new FrameDecoder();
    timeout.receive(frame[0]!.x, frame[0]!.y, 0);
    for (const event of frame.slice(1))
        assert.equal(timeout.receive(event.x, event.y, 5001), null);
    const wrong = new FrameDecoder();
    wrong.receive(frame[0]!.x, frame[0]!.y, 0);
    assert.equal(wrong.receive(frame[2]!.x, frame[2]!.y, 0), null);
    for (const event of frame.slice(3))
        assert.equal(wrong.receive(event.x, event.y, 0), null);
});
test('all encoded points avoid host AppBar', () => {
    for (const seq of [1, 2000])
        for (const event of encodeFrame(seq, [-1, 0, 1], true)) {
            assert.ok(event.x >= 0 && event.x < 200);
            assert.ok(event.y >= 80 && event.y <= 150);
        }
});
test('reject invalid target and sequence', () => {
    for (const target of [[NaN, 0, 0], [Infinity, 0, 0], [1.1, 0, 0], [0, 0]])
        assert.throws(() => encodeFrame(1, target, false));
    assert.throws(() => encodeFrame(0, point, false));
    assert.throws(() => encodeFrame(2001, point, false));
});
test('receiver freshness and pending gate fail closed', () => {
    const gate = new CommandGate('test');
    gate.observe(1, 100);
    const parsed = parseCommand(command);
    assert.equal(gate.begin(parsed, 110), true);
    assert.equal(gate.begin(parsed, 120), false);
    assert.equal(gate.canCommit(1101), false);
    gate.abort();
    assert.equal(gate.begin(parsed, 1102), false);
    const fresh = new CommandGate('test');
    fresh.observe(1, 0);
    assert.equal(fresh.begin(parsed, 1000), true);
    assert.equal(fresh.canCommit(1000), true);
    fresh.abort();
    assert.equal(fresh.begin(parsed, 1000), false);
});
test('malformed command rejected at wire boundary', () => {
    for (const change of [{ target: [1, NaN, 0] }, { target: [0, 0, 0] }, { target: [1, 1, 0] }, { run_id: '' }, { observation_seq: true }, { valid_for_ms: 999 }, { kind: 'other' }])
        assert.throws(() => parseCommand({ ...command, ...change }));
});
test('real Piu event kinds and expiry prevent a later commit', async () => {
    const { transmitFrame } = await import('./receiver.ts');
    const points = encodeFrame(1, point, false), sent: {
        kind: number;
        x: number;
        y: number;
    }[] = [];
    transmitFrame(points, (kind, x, y) => sent.push({ kind, x, y }), () => true, () => 10);
    assert.deepEqual(sent.map(p => p.kind), [0, 2, 0, 2, 0, 2, 0, 2, 0, 2]);
    sent.length = 0;
    assert.throws(() => transmitFrame(points, (kind, x, y) => sent.push({ kind, x, y }), () => sent.length < 8, () => 10));
    assert.equal(sent.length, 8);
    assert.ok(sent.every(p => p.y < 128), 'commit field was never transmitted');
});

test('expiry during began prevents ended delivery and SDK frame commit', async () => {
    const { transmitFrame } = await import('./receiver.ts');
    for (const expireAt of [0, 4]) {
        const gate = new CommandGate('test');
        gate.observe(1, 0);
        let clock = 999;
        assert.equal(gate.begin(parseCommand(command), clock), true);
        const points = encodeFrame(1, point, false), decoder = new FrameDecoder();
        const sent: number[] = [];
        let frames = 0;
        assert.throws(() => transmitFrame(points, (kind, x, y) => {
            sent.push(kind);
            if (kind === 0 && y === points[expireAt]!.y)
                clock = 1001;
            if (kind === 2 && decoder.receive(x, y, clock))
                frames++;
        }, () => gate.canCommit(clock), () => clock), /expired/);
        assert.equal(sent.at(-1), 0, 'expired ended event was never sent');
        assert.equal(frames, 0, 'no completed frame can reach SDK dispatch');
    }
});
