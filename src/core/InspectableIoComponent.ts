import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { IoComponent, IoComponentState } from '../core/@types/IoComponent';

export class InspectableIoComponent<TState = IoComponentState> implements IInspectableComponent {
    /**
     * Returns a serializable architecture view of the IO component, suitable for inspectors.
     */
    getInspectable() {
        // If the underlying ref has getInspectable, use it for config
        if (this.ref && typeof (this.ref as Partial<IInspectableComponent>).getInspectable === 'function') {
            const base = (this.ref as Partial<IInspectableComponent>).getInspectable!();
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
    ref: IoComponent<TState>;
    constructor(id: string, type: string, ref: IoComponent<TState>) {
        this.id = id;
        this.type = type;
        this.ref = ref;
    }
    get children() {
        return [];
    }
}
