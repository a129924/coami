import { Matrix3, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
export type Sample = {
    rotation: number[][];
    offset: [
        number,
        number
    ] | null;
    quaternion: number[];
};
/** Read rendered world transform once. Pose and offset share this quaternion. */
export function observe(head: Object3D, target: readonly number[]): Sample {
    const q = head.getWorldQuaternion(new Quaternion());
    const r = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(q));
    const s = new Matrix3().set(0, 1, 0, 0, 0, 1, 1, 0, 0);
    const sdk = s.clone().transpose().multiply(r).multiply(s), e = sdk.elements;
    const rotation = [[e[0]!, e[3]!, e[6]!], [e[1]!, e[4]!, e[7]!], [e[2]!, e[5]!, e[8]!]];
    const local = new Vector3(target[1], target[2], target[0]).applyQuaternion(q.clone().invert());
    const u = -local.x / local.z, v = -local.y / local.z;
    const offset: [
        number,
        number
    ] | null = local.z > 0 && Number.isFinite(u) && Number.isFinite(v) && Math.abs(u) <= 1 && Math.abs(v) <= 1 ? [u, v] : null;
    return { rotation, offset, quaternion: q.toArray() };
}
export function fixedTarget(head: Object3D, offset: readonly number[]): number[] {
    const direction = new Vector3(-offset[0]!, -offset[1]!, 1).normalize().applyQuaternion(head.getWorldQuaternion(new Quaternion()));
    return [direction.z, direction.x, direction.y];
}
export function poseError(head: Object3D, yaw: number, pitch: number): number {
    const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch));
    return expected.angleTo(head.getWorldQuaternion(new Quaternion()));
}
export const CASES = [
    { id: 'TC-E2E-01', offset: [0, 0], initial: 0 },
    ...[[.8, 0], [-.8, 0], [0, .8], [0, -.8], [.8, .8], [.8, -.8], [-.8, .8], [-.8, -.8], [.11, 0], [-.11, 0], [0, .11], [0, -.11]].map((offset, i) => ({ id: `TC-E2E-${String(i + 2).padStart(2, '0')}`, offset, initial: 0 })),
    { id: 'TC-E2E-14', offset: [.8, 0], initial: 1 }, { id: 'TC-E2E-15', offset: [.8, 0], initial: 2 },
];
export function centered(offset: readonly number[] | null): boolean { return offset !== null && offset.every(v => Math.abs(v) <= .1); }
/** Ignore diagnostic 250ms samples: four successive control-decision observations. */
export function oscillating(history: readonly (readonly number[])[]): boolean {
    const four = history.slice(-4);
    return four.length === 4 && [0, 1].some(axis => four.every(p => Math.abs(p[axis]!) > .1) && four.slice(1).every((p, i) => Math.sign(p[axis]!) !== Math.sign(four[i]![axis]!)));
}
