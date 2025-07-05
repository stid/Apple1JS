import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { InspectableData } from '../core/@types/InspectableTypes';
import { IoComponent, IoComponentState } from '../core/@types/IoComponent';

export class InspectableIoComponent<TState = IoComponentState> implements IInspectableComponent {
    /**
     * Returns a standardized view of the IO component.
     */
    getInspectable(): InspectableData {
        // If the underlying ref has getInspectable, use it and override id/type
        if (this.ref && typeof (this.ref as Partial<IInspectableComponent>).getInspectable === 'function') {
            const base = (this.ref as Partial<IInspectableComponent>).getInspectable!();
            return {
                ...base,
                id: this.id,
                type: this.type,
                name: this.name
            };
        }
        
        // Basic fallback
        return {
            id: this.id,
            type: this.type,
            name: this.name
        };
    }
    id: string;
    type: string;
    name?: string;
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
