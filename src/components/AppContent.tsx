import React, { useRef, useEffect, useState, useCallback, JSX } from 'react';
import Info from './Info';
import InspectorView from './InspectorView';
import DebuggerLayout from './DebuggerLayout';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import Actions from './Actions';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';
import { useToast } from '../contexts/ToastContext';
import { EmulationProvider } from '../contexts/EmulationContext';
import ExecutionControlsCluster from './ExecutionControlsCluster';
import { WorkerDataProvider } from '../contexts/WorkerDataContext';
import { IInspectableComponent } from '../core/types';
import type { WorkerManager } from '../services/WorkerManager';
import type { EngineStatusData } from '../apple1/types/worker-messages';
import { loggingService } from '../services/LoggingService';
import { useUnmountSafe } from '../hooks/useUnmountSafe';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

type Props = {
    workerManager: WorkerManager;
    apple1Instance?: IInspectableComponent | null;
};

interface AppContentInnerProps extends Props {
    rightTab: 'info' | 'inspector' | 'debugger';
    setRightTab: React.Dispatch<React.SetStateAction<'info' | 'inspector' | 'debugger'>>;
    pendingNavigation: { address: number; target: 'memory' | 'disassembly' } | null;
    setPendingNavigation: React.Dispatch<
        React.SetStateAction<{ address: number; target: 'memory' | 'disassembly' } | null>
    >;
}

const AppContentInner = ({
    workerManager,
    apple1Instance,
    rightTab,
    setRightTab,
    pendingNavigation,
    setPendingNavigation,
}: AppContentInnerProps): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    const [cycleAccurateTiming, setCycleAccurateTiming] = useState<boolean>(true);
    const [engineStatus, setEngineStatus] = useState<EngineStatusData | null>(null);
    const [isSwitchingEngine, setIsSwitchingEngine] = useState<boolean>(false);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const { subscribeToNavigation } = useDebuggerNavigation();
    const { showToast } = useToast();
    const { safeSetTimeout } = useUnmountSafe();

    // Persist debugger view addresses across tab switches AND reloads.
    const [memoryViewAddress, setMemoryViewAddress] = useLocalStorageState('apple1js_ui_memAddr', 0x0000);
    const [disassemblerAddress, setDisassemblerAddress] = useLocalStorageState('apple1js_ui_disasmAddr', 0x0000);

    // Subscribe to navigation events and switch to debugger tab
    useEffect(() => {
        const unsubscribe = subscribeToNavigation((event) => {
            setPendingNavigation({ address: event.address, target: event.target });
            setRightTab('debugger');
        });
        return unsubscribe;
    }, [subscribeToNavigation, setPendingNavigation, setRightTab]);

    const focusHiddenInput = useCallback(() => {
        const hiddenInput = hiddenInputRef.current;
        if (hiddenInput) {
            hiddenInput.focus();
        }
    }, []);

    // Poll the active CPU engine so the under-CRT toggle stays in sync with the
    // debugger's EngineSwitcher (either surface can trigger a switch). Mirrors
    // the 2s cadence used by EngineSwitcher.
    useEffect(() => {
        let cancelled = false;
        const fetchStatus = async () => {
            try {
                const status = await workerManager.getEngineStatus();
                if (!cancelled) {
                    setEngineStatus(status);
                }
            } catch (error) {
                loggingService.error('AppContent', `Failed to get engine status: ${error}`);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [workerManager]);

    const handleEngineSwitch = useCallback(async () => {
        if (isSwitchingEngine || !engineStatus) {
            return;
        }
        const target = engineStatus.currentEngine === 'WASM' ? 'JS' : 'WASM';
        setIsSwitchingEngine(true);
        try {
            await workerManager.switchEngine(target);
            const status = await workerManager.getEngineStatus();
            setEngineStatus(status);
            loggingService.info('AppContent', `Switched to ${target} engine`);
            showToast(`Switched to ${target} engine`, 'success');
        } catch (error) {
            loggingService.error('AppContent', `Failed to switch engine: ${error}`);
            showToast(`Failed to switch engine to ${target}.`, 'error');
        } finally {
            setIsSwitchingEngine(false);
        }
    }, [workerManager, engineStatus, isSwitchingEngine, showToast]);

    const handleKeyDown = useCallback(
        async (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) {
                return;
            }
            // Prevent default immediately for Tab and other special keys
            if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
            }
            await workerManager.keyDown(e.key);
            // Prevent default for all other keys after processing
            if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
                e.preventDefault();
            }
        },
        [workerManager],
    );

    const handlePaste = useCallback(
        async (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text');
            if (text) {
                // Send characters with a small delay between them to avoid overwhelming the Apple 1
                text.split('').forEach((char, index) => {
                    safeSetTimeout(async () => {
                        const keyToSend = char === '\n' || char === '\r' ? 'Enter' : char;
                        await workerManager.keyDown(keyToSend);
                    }, index * 160); // 160ms delay between each character
                });
            }
            e.preventDefault();
        },
        [workerManager, safeSetTimeout],
    );

    useEffect(() => {
        const hiddenInput = hiddenInputRef.current;
        if (hiddenInput) {
            hiddenInput.addEventListener('keydown', handleKeyDown);
            hiddenInput.addEventListener('paste', handlePaste);
        }
        return () => {
            if (hiddenInput) {
                hiddenInput.removeEventListener('keydown', handleKeyDown);
                hiddenInput.removeEventListener('paste', handlePaste);
            }
        };
    }, [handleKeyDown, handlePaste]);

    useEffect(() => {
        // Only focus on initial mount
        focusHiddenInput();
    }, [focusHiddenInput]);

    // Sync debugger active state with worker
    useEffect(() => {
        const isDebuggerActive = rightTab === 'debugger';
        workerManager.setDebuggerActive(isDebuggerActive).catch(console.error);
    }, [rightTab, workerManager]);

    const handleSaveState = useCallback(
        async (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            try {
                // Get state from WorkerManager
                const state = await workerManager.saveState();
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'apple1_state.json';
                document.body.appendChild(a);
                a.click();
                safeSetTimeout(() => {
                    if (document.body.contains(a)) {
                        document.body.removeChild(a);
                    }
                    URL.revokeObjectURL(url);
                }, 100);
                showToast('State saved: apple1_state.json', 'success');
            } catch (error) {
                loggingService.error('AppContent', `Failed to save state: ${error}`);
                showToast('Failed to save state.', 'error');
            }
        },
        [workerManager, safeSetTimeout, showToast],
    );

    const handleLoadState = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const state = JSON.parse(event.target?.result as string);
                    workerManager.loadState(state);
                    // Reset input so selecting the same file again triggers change
                    e.target.value = '';
                    showToast('State loaded', 'success');
                } catch {
                    showToast('Invalid state file.', 'error');
                }
            };
            reader.readAsText(file);
        },
        [workerManager, showToast],
    );

    return (
        <div
            className="flex flex-col lg:flex-row w-full h-full gap-0 lg:gap-3 p-1 sm:p-1 md:px-2 md:py-1"
            onClick={(e) => {
                // Refocus hidden input when clicking on the background
                if (e.target === e.currentTarget) {
                    focusHiddenInput();
                }
            }}
        >
            {/* Left column: CRT, Actions */}
            <div
                className="flex-none flex flex-col items-center bg-surface-overlay rounded-xl shadow-lg border border-border-primary p-md mx-auto lg:mx-0"
                style={{ maxWidth: '538px' }}
            >
                <div
                    className="w-full flex justify-center"
                    onClick={() => {
                        // Always refocus when clicking anywhere in the CRT area
                        focusHiddenInput();
                    }}
                    role="presentation"
                >
                    <CRTWorker workerManager={workerManager} />
                </div>
                <div className="mt-md w-full">
                    <Actions
                        supportBS={supportBS}
                        onBS={useCallback(
                            async (e) => {
                                e.preventDefault();
                                await workerManager.setCrtBsSupport(!supportBS);
                                setSupportBS((prev) => !prev);
                            },
                            [workerManager, supportBS],
                        )}
                        onSaveState={handleSaveState}
                        onLoadState={handleLoadState}
                        onRefocus={focusHiddenInput}
                        cycleAccurateTiming={cycleAccurateTiming}
                        onCycleAccurateTiming={useCallback(
                            async (e) => {
                                e.preventDefault();
                                await workerManager.setCycleAccurateMode(!cycleAccurateTiming);
                                setCycleAccurateTiming((prev) => !prev);
                            },
                            [workerManager, cycleAccurateTiming],
                        )}
                    />
                </div>
            </div>

            {/* Right column */}
            <div className="flex-1 bg-surface-overlay rounded-xl shadow-lg border border-border-primary p-md flex flex-col mt-1 lg:mt-0 overflow-hidden">
                <div className="flex-none flex items-center justify-between gap-sm flex-wrap mb-md">
                    <div className="flex gap-sm">
                        <button
                            className={`px-md py-sm rounded-lg font-mono text-xs tracking-wide transition-colors border font-medium ${
                                rightTab === 'info'
                                    ? 'bg-text-accent text-black border-text-accent'
                                    : 'bg-text-accent/10 text-text-accent border-text-accent/30 hover:bg-text-accent/20 hover:border-text-accent'
                            }`}
                            onClick={() => {
                                setRightTab('info');
                                focusHiddenInput();
                            }}
                        >
                            Info
                        </button>
                        <button
                            className={`px-md py-sm rounded-lg font-mono text-xs tracking-wide transition-colors border font-medium ${
                                rightTab === 'inspector'
                                    ? 'bg-text-accent text-black border-text-accent'
                                    : 'bg-text-accent/10 text-text-accent border-text-accent/30 hover:bg-text-accent/20 hover:border-text-accent'
                            }`}
                            onClick={() => {
                                setRightTab('inspector');
                                focusHiddenInput();
                            }}
                        >
                            Inspector
                        </button>
                        <button
                            className={`px-md py-sm rounded-lg font-mono text-xs tracking-wide transition-colors border font-medium ${
                                rightTab === 'debugger'
                                    ? 'bg-text-accent text-black border-text-accent'
                                    : 'bg-text-accent/10 text-text-accent border-text-accent/30 hover:bg-text-accent/20 hover:border-text-accent'
                            }`}
                            onClick={() => {
                                setRightTab('debugger');
                                focusHiddenInput();
                            }}
                        >
                            Debugger
                        </button>
                    </div>
                    {/* Always-visible execution bar: the single home for run-state +
                        run/pause/step/reset + engine switch, regardless of which tab is shown. */}
                    <ExecutionControlsCluster
                        workerManager={workerManager}
                        currentEngine={engineStatus?.currentEngine ?? 'WASM'}
                        wasmAvailable={engineStatus?.availableEngines.includes('WASM') ?? false}
                        isSwitchingEngine={isSwitchingEngine}
                        onEngineSwitch={handleEngineSwitch}
                    />
                </div>
                <div className="flex-1 overflow-hidden">
                    {rightTab === 'info' && (
                        <div className="overflow-auto h-full">
                            <Info />
                        </div>
                    )}
                    {rightTab === 'inspector' && apple1Instance && (
                        <div className="overflow-auto h-full">
                            <InspectorView root={apple1Instance} workerManager={workerManager} />
                        </div>
                    )}
                    {rightTab === 'inspector' && !apple1Instance && (
                        <div className="p-4 text-red-400">Inspector not available - Apple1 instance not connected.</div>
                    )}
                    {rightTab === 'debugger' && apple1Instance && (
                        <div className="h-full" style={{ overflow: 'hidden' }}>
                            <DebuggerLayout
                                root={apple1Instance}
                                workerManager={workerManager}
                                initialNavigation={pendingNavigation}
                                onNavigationHandled={() => setPendingNavigation(null)}
                                memoryViewAddress={memoryViewAddress}
                                setMemoryViewAddress={setMemoryViewAddress}
                                disassemblerAddress={disassemblerAddress}
                                setDisassemblerAddress={setDisassemblerAddress}
                            />
                        </div>
                    )}
                    {rightTab === 'debugger' && !apple1Instance && (
                        <div className="p-4 text-red-400">Debugger not available - Apple1 instance not connected.</div>
                    )}
                </div>
            </div>
            <input
                type="text"
                ref={hiddenInputRef}
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                }}
                tabIndex={0}
                aria-label="Hidden input for keyboard focus"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value=""
                onChange={() => {}}
            />
        </div>
    );
};

export const AppContent = ({ workerManager, apple1Instance }: Props): JSX.Element => {
    const [rightTab, setRightTab] = useLocalStorageState<'info' | 'inspector' | 'debugger'>(
        'apple1js_ui_rightTab',
        'info',
    );
    const [pendingNavigation, setPendingNavigation] = useState<{
        address: number;
        target: 'memory' | 'disassembly';
    } | null>(null);

    const handleBreakpointHit = useCallback(
        (address: number) => {
            // When any breakpoint hits, switch to debugger tab and disassembly view
            setPendingNavigation({ address, target: 'disassembly' });
            setRightTab('debugger');
        },
        [setRightTab],
    );

    const handleRunToCursorSet = useCallback(
        (address: number | null) => {
            // When run-to-cursor is set, switch to debugger tab and disassembly view
            if (address !== null) {
                setPendingNavigation({ address, target: 'disassembly' });
                setRightTab('debugger');
            }
        },
        [setRightTab],
    );

    return (
        <WorkerDataProvider workerManager={workerManager}>
            <EmulationProvider
                workerManager={workerManager}
                onBreakpointHit={handleBreakpointHit}
                onRunToCursorSet={handleRunToCursorSet}
            >
                <AppContentInner
                    workerManager={workerManager}
                    {...(apple1Instance !== undefined && { apple1Instance })}
                    rightTab={rightTab}
                    setRightTab={setRightTab}
                    pendingNavigation={pendingNavigation}
                    setPendingNavigation={setPendingNavigation}
                />
            </EmulationProvider>
        </WorkerDataProvider>
    );
};
