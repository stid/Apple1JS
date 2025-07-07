import type { EmulatorState } from '../apple1/TSTypes';

/**
 * Service for persisting and restoring emulator state
 * Handles local storage, file I/O, and state validation
 */
export class StatePersistenceService {
    private static readonly STORAGE_KEY = 'apple1js_emulator_state';
    private static readonly STORAGE_VERSION = 1;

    /**
     * Save state to local storage
     */
    async saveToLocalStorage(state: EmulatorState): Promise<void> {
        try {
            const wrapper = {
                version: StatePersistenceService.STORAGE_VERSION,
                timestamp: Date.now(),
                state
            };
            window.localStorage.setItem(
                StatePersistenceService.STORAGE_KEY,
                JSON.stringify(wrapper)
            );
        } catch (error) {
            throw new Error(`Failed to save state to local storage: ${error}`);
        }
    }

    /**
     * Load state from local storage
     */
    async loadFromLocalStorage(): Promise<EmulatorState | null> {
        try {
            const stored = window.localStorage.getItem(StatePersistenceService.STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const wrapper = JSON.parse(stored);
            if (wrapper.version !== StatePersistenceService.STORAGE_VERSION) {
                throw new Error(`Incompatible state version: ${wrapper.version}`);
            }

            return wrapper.state;
        } catch (error) {
            console.error('Failed to load state from local storage:', error);
            return null;
        }
    }

    /**
     * Clear state from local storage
     */
    clearLocalStorage(): void {
        window.localStorage.removeItem(StatePersistenceService.STORAGE_KEY);
    }

    /**
     * Export state to file
     */
    async exportToFile(state: EmulatorState, filename?: string): Promise<void> {
        const wrapper = {
            version: StatePersistenceService.STORAGE_VERSION,
            timestamp: Date.now(),
            metadata: {
                exportDate: new Date().toISOString(),
                userAgent: window.navigator.userAgent
            },
            state
        };

        const blob = new Blob(
            [JSON.stringify(wrapper, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `apple1js_state_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import state from file
     */
    async importFromFile(file: File): Promise<EmulatorState> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const wrapper = JSON.parse(text);
                    
                    if (wrapper.version !== StatePersistenceService.STORAGE_VERSION) {
                        throw new Error(`Incompatible state version: ${wrapper.version}`);
                    }
                    
                    if (!this.validateState(wrapper.state)) {
                        throw new Error('Invalid state format');
                    }
                    
                    resolve(wrapper.state);
                } catch (error) {
                    reject(new Error(`Failed to parse state file: ${error}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read state file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Get list of available saved states (for future multi-slot saves)
     */
    async getAvailableStates(): Promise<Array<{ id: string; timestamp: number; name?: string }>> {
        const states: Array<{ id: string; timestamp: number; name?: string }> = [];
        
        // Check local storage
        const stored = window.localStorage.getItem(StatePersistenceService.STORAGE_KEY);
        if (stored) {
            try {
                const wrapper = JSON.parse(stored);
                states.push({
                    id: 'local',
                    timestamp: wrapper.timestamp,
                    name: 'Auto-save'
                });
            } catch (error) {
                console.error('Failed to parse local storage state:', error);
            }
        }
        
        return states;
    }

    /**
     * Validate state structure
     */
    private validateState(state: unknown): state is EmulatorState {
        // Basic validation - could be expanded
        return (
            state !== null &&
            typeof state === 'object' &&
            'cpu' in state &&
            'ram' in state &&
            Array.isArray((state as { ram: unknown }).ram)
        );
    }

    /**
     * Create a state snapshot with metadata
     */
    async createSnapshot(state: EmulatorState, metadata?: { name?: string; description?: string }): Promise<void> {
        const snapshot = {
            id: `snapshot_${Date.now()}`,
            timestamp: Date.now(),
            metadata: {
                ...metadata,
                createdAt: new Date().toISOString()
            },
            state
        };

        // For now, just save to local storage with a unique key
        const key = `apple1js_snapshot_${snapshot.id}`;
        window.localStorage.setItem(key, JSON.stringify(snapshot));
    }

    /**
     * Get autosave configuration
     */
    getAutosaveConfig(): { enabled: boolean; intervalMs: number } {
        const stored = window.localStorage.getItem('apple1js_autosave_config');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                // Ignore parse errors
            }
        }
        return { enabled: true, intervalMs: 30000 }; // Default: autosave every 30 seconds
    }

    /**
     * Set autosave configuration
     */
    setAutosaveConfig(config: { enabled: boolean; intervalMs: number }): void {
        window.localStorage.setItem('apple1js_autosave_config', JSON.stringify(config));
    }
}