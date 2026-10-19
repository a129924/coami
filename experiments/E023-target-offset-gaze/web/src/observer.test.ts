import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, Quaternion, Vector3 } from 'three';
import { CASES, observe, fixedTarget, poseError, oscillating } from './observer.ts';
test('rendered transform, not commanded rotation, determines projection', () => {
    const head = new Group(), target = [1, -.8, 0];
    assert.deepEqual(observe(head, target).offset, [.8, -0]);
    head.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const sample = observe(head, [0, 1, 0]);
    assert.ok(Math.abs(sample.offset![0]) < 1e-12);
    assert.ok(Math.abs(sample.rotation[0]![1]! + 1) < 1e-12);
    assert.ok(Math.abs(sample.rotation[1]![0]! - 1) < 1e-12);
});
test('fixed target projection at compound initial orientation and scale', () => {
    const head = new Group();
    head.quaternion.copy(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .35).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .17)));
    head.scale.setScalar(2);
    const target = fixedTarget(head, [.8, -.8]);
    const sample = observe(head, target);
    assert.ok(Math.abs(sample.offset![0] - .8) < 1e-12);
    assert.ok(Math.abs(sample.offset![1] + .8) < 1e-12);
    assert.ok(poseError(head, .35, .17) < 1e-6);
    assert.equal(observe(head, [-1, 0, 0]).offset, null);
});
test('all fifteen predeclared cases and persistent oscillation rule', () => {
    assert.equal(CASES.length, 15);
    assert.equal(new Set(CASES.map(c => c.id)).size, 15);
    assert.equal(oscillating([[.8, 0], [-.8, 0], [.7, 0], [-.7, 0]]), true);
    assert.equal(oscillating([[.8, 0], [-.8, 0], [.01, 0], [-.7, 0]]), false);
});
