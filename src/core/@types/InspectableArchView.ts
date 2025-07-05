export interface InspectableArchView {
    id: string;
    type: string;
    name?: string;
    [key: string]: unknown; // Allow extension for component-specific fields
}
