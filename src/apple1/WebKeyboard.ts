import { IoComponent, InspectableData } from '@/core/types';

const B7BS = 0xdf; // Backspace key, arrow left key (B7 High)
const B7ESC = 0x9b; // ESC key (B7 High)
const B7CR = 0x8d;
const RESET_CODE = -255;

// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
import type { IInspectableComponent } from '@/core/types';

class Keyboard implements IoComponent, IInspectableComponent {
    id: string = 'keyboard';
    type: string = 'IoComponent';
    name?: string = 'Keyboard Input';
    lastKey?: string;
    connected: boolean = true;
    getInspectable(): InspectableData {
        return {
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            state: {
                lastKey: this.lastKey ?? '(none)',
                connected: this.connected
            }
        };
    }
    private wireWrite: ((value: number) => Promise<number | void>) | undefined;

    wire(conf: { write?: (value: number) => Promise<number | void> }): void {
        this.wireWrite = conf.write ?? undefined;
    }

    reset(): void {
        return;
    }

    async write(key: string): Promise<number | void> {
        this.lastKey = key;
        const wireWrite = this.wireWrite;
        let result;
        if (wireWrite) {
            // Standard Keys
            switch (key) {
                case 'Tab':
                    result = await wireWrite(RESET_CODE);
                    break;
                case 'Backspace':
                    result = await wireWrite(B7BS);
                    break;
                case 'Escape':
                    result = await wireWrite(B7ESC);
                    break;
                case 'Enter':
                    result = await wireWrite(B7CR);
                    break;
                default: {
                    if (key.length === 1) {
                        result = await wireWrite(key.toUpperCase().charCodeAt(0));
                    }
                }
            }
        }
        return result;
    }
}

export default Keyboard;
