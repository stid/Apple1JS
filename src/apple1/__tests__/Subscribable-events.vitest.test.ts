import { Subscribable } from '../Subscribable';

describe('Subscribable', () => {
    it('delivers emitted values to a subscriber', () => {
        const ev = new Subscribable<number>();
        const seen: number[] = [];
        ev.subscribe((v) => seen.push(v));
        ev.emit(1);
        ev.emit(2);
        expect(seen).toEqual([1, 2]);
    });

    it('stops delivery after unsubscribe', () => {
        const ev = new Subscribable<number>();
        const seen: number[] = [];
        const unsub = ev.subscribe((v) => seen.push(v));
        ev.emit(1);
        unsub();
        ev.emit(2);
        expect(seen).toEqual([1]);
    });

    it('fans out to every listener', () => {
        const ev = new Subscribable<string>();
        const a: string[] = [];
        const b: string[] = [];
        ev.subscribe((v) => a.push(v));
        ev.subscribe((v) => b.push(v));
        ev.emit('x');
        expect(a).toEqual(['x']);
        expect(b).toEqual(['x']);
    });

    it('isolates a throwing listener and routes the error to onError', () => {
        const errors: unknown[] = [];
        const ev = new Subscribable<number>((e) => errors.push(e));
        const seen: number[] = [];
        ev.subscribe(() => {
            throw new Error('boom');
        });
        ev.subscribe((v) => seen.push(v));
        ev.emit(42);
        expect(seen).toEqual([42]); // sibling still received the value
        expect(errors).toHaveLength(1);
        expect((errors[0] as Error).message).toBe('boom');
    });

    it('tracks the live listener count', () => {
        const ev = new Subscribable<void>();
        expect(ev.size).toBe(0);
        const unsub = ev.subscribe(() => {});
        ev.subscribe(() => {});
        expect(ev.size).toBe(2);
        unsub();
        expect(ev.size).toBe(1);
    });
});
