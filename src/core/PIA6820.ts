import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoComponent } from './@types/IoComponent';
import { subscribeFunction } from './@types/PubSub';
import * as utils from './utils';

const A_KBD = 0x0;
const A_KBDCR = 0x1;
const B_DSP = 0x2;
const B_DSPCR = 0x3;

class PIA6820 implements IInspectableComponent {
    /**
     * Returns a serializable copy of the PIA state.
     */
    saveState(): object {
        return {
            data: [...this.data],
        };
    }

    /**
     * Restores PIA state from a previously saved state.
     */
    loadState(state: { data: number[] }): void {
        if (!state || !Array.isArray(state.data) || state.data.length !== this.data.length) {
            throw new Error('Invalid PIA state or size mismatch');
        }
        this.data = [...state.data];
        // Always clear PB7 (display busy) after restore to avoid stuck display
        this.clearBitDataB(7);
        // Notify all subscribers after restoring state to ensure display logic and others are up to date
        this._notifySubscribers();
    }
    /**
     * Returns a serializable architecture view of the PIA6820 and its children, suitable for inspectors.
     */
    getInspectable() {
        const self = this as unknown as { __address?: string; __addressName?: string };
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            children: this.children.map((child) =>
                typeof child.getInspectable === 'function'
                    ? child.getInspectable()
                    : { id: child.id, type: child.type },
            ),
            data: [...this.data],
        };
    }
    id = 'pia6820';
    type = 'PIA6820';
    name?: string;
    get children() {
        const children = [];
        if (
            this.ioA &&
            typeof this.ioA === 'object' &&
            'type' in this.ioA &&
            'id' in this.ioA &&
            typeof this.ioA.id === 'string' &&
            typeof this.ioA.type === 'string'
        ) {
            children.push(this.ioA as import('./@types/IInspectableComponent').IInspectableComponent);
        }
        if (
            this.ioB &&
            typeof this.ioB === 'object' &&
            'type' in this.ioB &&
            'id' in this.ioB &&
            typeof this.ioB.id === 'string' &&
            typeof this.ioB.type === 'string'
        ) {
            children.push(this.ioB as import('./@types/IInspectableComponent').IInspectableComponent);
        }
        return children;
    }
    private data: number[];
    ioA?: IoComponent;
    ioB?: IoComponent;
    private subscribers: subscribeFunction<number[]>[];

    constructor() {
        this.data = [0, 0, 0, 0];
        this.subscribers = [];
    }

    reset(): void {
        this.data.fill(0);
    }

    subscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers.push(subFunc);
        subFunc([...this.data]);
    }

    unsubscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers = this.subscribers.filter((subItem) => subItem !== subFunc);
    }

    private _notifySubscribers() {
        this.subscribers.forEach((subFunc) => subFunc([...this.data]));
    }

    wireIOA(ioA: IoComponent): void {
        this.ioA = ioA;
    }

    wireIOB(ioB: IoComponent): void {
        this.ioB = ioB;
    }

    private updateBitData(reg: number, bit: number, set: boolean): void {
        this.data[reg] = set ? utils.bitSet(this.data[reg], bit) : utils.bitClear(this.data[reg], bit);
    }

    setBitDataA(bit: number): void {
        this.updateBitData(A_KBD, bit, true);
    }

    clearBitDataA(bit: number): void {
        this.updateBitData(A_KBD, bit, false);
    }

    setBitCtrA(bit: number): void {
        this.updateBitData(A_KBDCR, bit, true);
    }

    clearBitCrtA(bit: number): void {
        this.updateBitData(A_KBDCR, bit, false);
    }

    setBitDataB(bit: number): void {
        this.updateBitData(B_DSP, bit, true);
    }

    clearBitDataB(bit: number): void {
        this.updateBitData(B_DSP, bit, false);
    }

    setBitCtrB(bit: number): void {
        this.updateBitData(B_DSPCR, bit, true);
    }

    clearBitCrtB(bit: number): void {
        this.updateBitData(B_DSPCR, bit, false);
    }

    setDataA(value: number): void {
        this.data[A_KBD] = value;
    }

    setDataB(value: number): void {
        this.data[B_DSP] = value;
    }

    read(address: number): number {
        if (address === A_KBD) this.clearBitCrtA(7);
        if (address === B_DSP) this.clearBitCrtB(7);
        return this.data[address];
    }

    write(address: number, value: number): void {
        this.data[address] = value;
        this._notifySubscribers();

        const ioComponent = address === A_KBD ? this.ioA : address === B_DSP ? this.ioB : null;
        if (ioComponent) ioComponent.write(value);
    }

    toLog(): void {
        console.log(this.data);
    }

    toDebug(): { [key: string]: string } {
        return {
            A_KBD: this.data[0].toString(16).padStart(2, '0').toUpperCase(),
            A_KBDCR: this.data[1].toString(16).padStart(2, '0').toUpperCase(),
            B_DSP: this.data[2].toString(16).padStart(2, '0').toUpperCase(),
            B_DSPCR: this.data[3].toString(16).padStart(2, '0').toUpperCase(),
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flash(_data: Array<number>): void {
        return;
    }
}

export default PIA6820;
