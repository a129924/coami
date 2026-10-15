import 'piu/MC';
import Timer from 'timer';
import Time from 'time';
import { FrameDecoder } from './protocol';
type Rotation = {
    y: number;
    p: number;
    r: number;
};
type Robot = {
    ui: {
        setMain(content: PiuContainer): void;
    };
    motion: {
        lookAt(point: [
            number,
            number,
            number
        ]): void;
        lookAway(): void;
        setPose(pose: {
            rotation: Rotation;
        }, duration: number): Promise<void>;
    };
    input: {
        button: {
            a: {
                onEvent: (event: {
                    pressed: boolean;
                }) => void;
            };
            b: {
                onEvent: (event: {
                    pressed: boolean;
                }) => void;
            };
        };
    };
};
const emit = (event: object): void => trace(`COAMI23|${JSON.stringify(event)}\n`);
const INITIAL: Rotation[] = [{ y: 0, p: 0, r: 0 }, { y: 20 * Math.PI / 180, p: 10 * Math.PI / 180, r: 0 }, { y: -20 * Math.PI / 180, p: -10 * Math.PI / 180, r: 0 }];
export function onContextCreated(robot: Robot): void {
    const decoder = new FrameDecoder();
    let busy = false, initial = 0, lastTouch = -1, prepared = false, lastMotion = -Infinity;
    const screen = new Container(null, { left: 0, right: 0, top: 0, bottom: 0, active: true, skin: new Skin({ fill: '#213441' }), Behavior: class extends Behavior {
            onTouchBegan(_content: PiuContainer, id: number): void { lastTouch = id; }
            onTouchEnded(_content: PiuContainer, id: number, x: number, y: number): void {
                if (lastTouch !== id || busy)
                    return;
                lastTouch = -1;
                const frame = decoder.receive(x, y, Time.ticks);
                if (!frame)
                    return;
                emit({ phase: 'decoded', ...frame });
                if (frame.probe) {
                    emit({ phase: 'probe', ...frame });
                    return;
                }
                if (!prepared || Time.ticks - lastMotion < 5000 || Math.abs(Math.sqrt(frame.target.reduce((sum, v) => sum + v * v, 0)) - 1) > 0.001) {
                    emit({ phase: 'failed', seq: frame.seq, error: 'not_initialized_or_pending' });
                    return;
                }
                lastMotion = Time.ticks;
                try {
                    robot.motion.lookAt(frame.target as [
                        number,
                        number,
                        number
                    ]);
                    emit({ phase: 'returned', seq: frame.seq, target: frame.target });
                }
                catch (error) {
                    emit({ phase: 'failed', seq: frame.seq, error: String(error) });
                }
            }
        } });
    robot.ui.setMain(screen);
    robot.input.button.a.onEvent = event => { if (event.pressed && !busy) {
        initial = (initial + 1) % INITIAL.length;
        emit({ phase: 'initial-selected', initial });
    } };
    robot.input.button.b.onEvent = event => {
        if (!event.pressed || busy)
            return;
        busy = true;
        Timer.set(() => {
            void (async () => {
                try {
                    robot.motion.lookAway();
                    await robot.motion.setPose({ rotation: INITIAL[initial]! }, 0.25);
                    prepared = true;
                    emit({ phase: 'initialized', initial });
                }
                catch (error) {
                    emit({ phase: 'init-failed', error: String(error) });
                }
                finally {
                    busy = false;
                }
            })();
        }, 0);
    };
    emit({ phase: 'ready', experiment: 'E023' });
}
