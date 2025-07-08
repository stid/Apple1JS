/**
 * Component inspection and architecture view type definitions
 */

/**
 * Base properties that all inspectable components must provide
 */
export interface InspectableBase {
    id: string;
    type: string;
    name?: string;
}

/**
 * Memory address information
 */
export interface InspectableAddress {
    address?: string;
    addressName?: string;
}

/**
 * Performance statistics
 */
export interface InspectableStats {
    [key: string]: string | number;
}

/**
 * Child component reference
 */
export interface InspectableChild {
    id: string;
    type: string;
    name?: string;
    component?: InspectableData;
}

/**
 * Standard structure for component data
 */
export interface InspectableData extends InspectableBase, InspectableAddress {
    // Memory/Size information
    size?: number;
    
    // Performance/Statistics
    stats?: InspectableStats;
    
    // Hierarchical relationships
    children?: InspectableChild[];
    
    // Component state (formatted for display)
    state?: Record<string, string | number | boolean>;
    
    // Debug information (optional)
    debug?: {
        stack?: Array<{ addr: string; value: number }>;
        disasm?: unknown;
        trace?: unknown;
    };
    
    // Allow additional properties for backward compatibility
    [key: string]: unknown;
}

/**
 * Interface for components that can be inspected
 */
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

/**
 * Architecture view node for visualization
 */
export interface ArchViewNode {
    id: string;
    type: 'cpu' | 'bus' | 'clock' | 'memory' | 'io' | 'display';
    label: string;
    address?: string;
    size?: number;
    stats?: InspectableStats;
    children?: ArchViewNode[];
}

/**
 * Extended architecture view with connections
 */
export interface ArchitectureView {
    nodes: ArchViewNode[];
    connections: Array<{
        from: string;
        to: string;
        type: 'data' | 'control' | 'clock';
    }>;
}

/**
 * Helper type guard for runtime checking
 */
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