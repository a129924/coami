export type Command = {
    kind: 'command';
    run_id: string;
    command_id: string;
    observation_seq: number;
    target: number[];
    valid_for_ms: 1000;
};
export function parseCommand(value: unknown): Command {
    if (!value || typeof value !== 'object')
        throw Error('invalid command');
    const d = value as Record<string, unknown>;
    if (d.kind !== 'command' || typeof d.run_id !== 'string' || !d.run_id || typeof d.command_id !== 'string' || d.command_id !== `${d.run_id}:${d.observation_seq}` || !Number.isInteger(d.observation_seq) || Number(d.observation_seq) < 1 || Number(d.observation_seq) > 2000 || d.valid_for_ms !== 1000 || !Array.isArray(d.target) || d.target.length !== 3 || d.target.some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1 + 1e-6))
        throw Error('invalid command');
    if (Math.abs(Math.hypot(...d.target) - 1) > 1e-6)
        throw Error('target must lie on the 1m virtual sphere');
    const command = d as Command;
    const norm = Math.hypot(...command.target);
    return { ...command, target: command.target.map(v => v / norm) };
}
export class CommandGate {
    private run: string;
    private observation: {
        seq: number;
        created: number;
    } | null = null;
    private used = 0;
    private pending: Command | null = null;
    constructor(run: string) { this.run = run; }
    observe(seq: number, created: number): void { if (this.pending)
        throw Error('pending'); this.observation = { seq, created }; }
    begin(command: Command, now: number): boolean {
        const o = this.observation;
        if (this.pending || command.run_id !== this.run || !o || command.observation_seq !== o.seq || o.seq <= this.used || now < o.created || now - o.created > 1000)
            return false;
        this.pending = command;
        this.used = o.seq;
        return true;
    }
    canCommit(now: number): boolean { return this.pending !== null && this.observation !== null && now >= this.observation.created && now - this.observation.created <= 1000; }
    abort(): void { this.pending = null; this.observation = null; }
}
export function transmitFrame(points: readonly {
    x: number;
    y: number;
}[], send: (kind: number, x: number, y: number, when: number) => void, isValid: () => boolean, now: () => number): void {
    for (const { x, y } of points) {
        if (!isValid())
            throw Error('expired before commit; frame aborted');
        send(0, x, y, now());
        if (!isValid())
            throw Error('expired before ended; frame aborted');
        // Pinned Piu: 0 began, 1 cancelled, 2 ended, 3 moved.
        send(2, x, y, now());
    }
}
