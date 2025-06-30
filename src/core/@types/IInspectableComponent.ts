import type { InspectableArchView } from './InspectableArchView';

export interface IInspectableComponent {
    id: string;
    type: string;
    children?: IInspectableComponent[];
    /**
     * Returns a serializable architecture view of the component and its children, suitable for inspectors.
     */
    getInspectable?(): InspectableArchView;
}

// Helper type guard for runtime checking
export function isInspectableComponent(obj: unknown): obj is IInspectableComponent {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        typeof (obj as { id: unknown }).id === 'string' &&
        'type' in obj &&
        typeof (obj as { type: unknown }).type === 'string'
    );
}
