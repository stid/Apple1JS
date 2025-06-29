import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { IoComponent } from '../core/@types/IoComponent';

export class InspectableIoComponent implements IInspectableComponent {
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
