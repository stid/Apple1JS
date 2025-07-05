import type { InspectableData } from './InspectableTypes';

export interface IInspectableComponent {
    id: string;
    type: string;
    name?: string;
    children?: IInspectableComponent[];
    /**
     * Returns a standardized, serializable view of the component suitable for inspectors.
     * 
     * All implementations should follow the InspectableData structure:
     * - Base properties: id, type, name (optional)
     * - Address info: address, addressName (if memory-mapped)
     * - Performance: stats object for metrics
     * - Hierarchy: children array for sub-components
     * - State: formatted component state for display
     * - Debug: optional debug information
     */
    getInspectable(): InspectableData;
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
