/** Experimental screen transport; only ended touches are decoded. No SDK dependency. */
export type Frame = {
    seq: number;
    probe: boolean;
    target: number[];
};
export type ScreenPoint = {
    x: number;
    y: number;
};
export function encodeFrame(seq: number, target: readonly number[], probe: boolean): ScreenPoint[] {
    if (!Number.isInteger(seq) || seq < 1 || seq > 2000)
        throw Error('invalid sequence');
    if (target.length !== 3 || target.some(v => !Number.isFinite(v) || Math.abs(v) > 1))
        throw Error('invalid target');
    const values = [seq, ...target.map(v => Math.floor((v + 1) * 1000 + 0.5)), seq];
    return values.map((q, index) => ({ x: q % 200, y: 80 + 12 * (index === 0 && probe ? 5 : index) + Math.floor(q / 200) }));
}
export class FrameDecoder {
    private frame: {
        seq: number;
        probe: boolean;
        started: number;
        values: number[];
    } | null = null;
    private lastSeq = 0;
    receive(x: number, y: number, now: number): Frame | null {
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= 200 || y < 80 || y > 150 || !Number.isFinite(now)) {
            this.frame = null;
            return null;
        }
        const field = Math.floor((y - 80) / 12), q = ((y - 80) % 12) * 200 + x;
        if (q > 2000) {
            this.frame = null;
            return null;
        }
        if (field === 0 || field === 5) {
            this.frame = q > this.lastSeq && q >= 1 ? { seq: q, probe: field === 5, started: now, values: [] } : null;
            return null;
        }
        const current = this.frame;
        if (!current || now < current.started || now - current.started > 5000 || field !== current.values.length + 1) {
            this.frame = null;
            return null;
        }
        if (field === 4) {
            this.frame = null;
            if (q !== current.seq)
                return null;
            this.lastSeq = q;
            return { seq: q, probe: current.probe, target: current.values.map(v => v / 1000 - 1) };
        }
        current.values.push(q);
        return null;
    }
}
