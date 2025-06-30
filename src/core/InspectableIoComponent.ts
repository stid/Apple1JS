import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { IoComponent } from '../core/@types/IoComponent';

export class InspectableIoComponent implements IInspectableComponent {
    /**
     * Returns a serializable architecture view of the IO component, suitable for inspectors.
     */
    getInspectable() {
        // If the underlying ref has getInspectable, use it for config
        const refAny = this.ref as any;
        if (refAny && typeof refAny.getInspectable === 'function') {
            const base = refAny.getInspectable();
            return {
                ...base,
                id: this.id,
                type: this.type,
            };
        }
        return {
            id: this.id,
            type: this.type,
        };
    }
    id: string;
    type: string;
    ref: IoComponent;
    constructor(id: string, type: string, ref: IoComponent) {
        this.id = id;
        this.type = type;
        this.ref = ref;
    }
    get children() {
        return [];
    }
}
