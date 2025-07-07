import React, { useRef, useEffect, useState, useCallback, JSX } from 'react';
import Info from './Info';
import InspectorView from './InspectorView';
import DebuggerLayout from './DebuggerLayout';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import { WORKER_MESSAGES, LogMessageData } from '../apple1/TSTypes';
import Actions from './Actions';
import AlertBadges from './AlertBadges';
import AlertPanel from './AlertPanel';
import { useLogging } from '../contexts/LoggingContext';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

type Props = {
    worker: Worker;
    apple1Instance?: IInspectableComponent | null;
};

export const AppContent = ({ worker, apple1Instance }: Props): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [cycleAccurateTiming, setCycleAccurateTiming] = useState<boolean>(true);
    // Right panel tab: 'info', 'inspector', or 'debugger'
    const [rightTab, setRightTab] = useState<'info' | 'inspector' | 'debugger'>('info');
    const [alertPanelOpen, setAlertPanelOpen] = useState<boolean>(false);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const { addMessage } = useLogging();
    const { subscribeToNavigation } = useDebuggerNavigation();
    
    // Store the pending navigation for when debugger tab is activated
    const [pendingNavigation, setPendingNavigation] = useState<{ address: number; target: 'memory' | 'disassembly' } | null>(null);

    // Subscribe to navigation events and switch to debugger tab
    useEffect(() => {
        const unsubscribe = subscribeToNavigation((event) => {
            setPendingNavigation({ address: event.address, target: event.target });
            setRightTab('debugger');
        });
        return unsubscribe;
    }, [subscribeToNavigation]);

    const focusHiddenInput = useCallback(() => {
        const hiddenInput = hiddenInputRef.current;
        if (hiddenInput) {
            hiddenInput.focus();
        }
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) {
                return;
            }
            worker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
            e.preventDefault();
        },
        [worker],
    );

    const handlePaste = useCallback(
        async (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text');
            if (text) {
                // Send characters with a small delay between them to avoid overwhelming the Apple 1
                text.split('').forEach((char, index) => {
                    setTimeout(() => {
                        const keyToSend = char === '\n' || char === '\r' ? 'Enter' : char;
                        worker.postMessage({ data: keyToSend, type: WORKER_MESSAGES.KEY_DOWN });
                    }, index * 160); // 160ms delay between each character
                });
            }
            e.preventDefault();
        },
        [worker],
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
        focusHiddenInput();
    }, [focusHiddenInput]);

    // Handle log messages from worker
    useEffect(() => {
        const handleWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === WORKER_MESSAGES.LOG_MESSAGE) {
                const logData = event.data.data as LogMessageData;
                addMessage({
                    level: logData.level,
                    source: logData.source,
                    message: logData.message
                });
            } else if (event.data && event.data.type === WORKER_MESSAGES.EMULATION_STATUS) {
                setIsPaused(event.data.data.isPaused);
            }
        };
        
        worker.addEventListener('message', handleWorkerMessage);
        return () => {
            worker.removeEventListener('message', handleWorkerMessage);
        };
    }, [worker, addMessage]);

    // Sync debugger active state with worker
    useEffect(() => {
        const isDebuggerActive = rightTab === 'debugger';
        worker.postMessage({ data: isDebuggerActive, type: WORKER_MESSAGES.SET_DEBUGGER_ACTIVE });
    }, [rightTab, worker]);

    const handleSaveState = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            // Request state from worker
            const handleStateData = (event: MessageEvent) => {
                if (event.data && event.data.type === WORKER_MESSAGES.STATE_DATA) {
                    const state = event.data.data;
                    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'apple1_state.json';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                    worker.removeEventListener('message', handleStateData);
                }
            };
            worker.addEventListener('message', handleStateData);
            worker.postMessage({ type: WORKER_MESSAGES.SAVE_STATE });
        },
        [worker],
    );

    const handleLoadState = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const state = JSON.parse(event.target?.result as string);
                    worker.postMessage({ type: WORKER_MESSAGES.LOAD_STATE, data: state });
                    // Reset input so selecting the same file again triggers change
                    e.target.value = '';
                } catch {
                    window.alert('Invalid state file.');
                }
            };
            reader.readAsText(file);
        },
        [worker],
    );

    const handlePauseResume = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (isPaused) {
                worker.postMessage({ type: WORKER_MESSAGES.RESUME_EMULATION });
            } else {
                worker.postMessage({ type: WORKER_MESSAGES.PAUSE_EMULATION });
            }
        },
        [worker, isPaused],
    );

    return (
        <div className="flex flex-col lg:flex-row w-full h-full gap-0 lg:gap-3 p-1 sm:p-1 md:px-2 md:py-1">
            {/* Left column: CRT, Actions */}
            <div
                className="flex-none flex flex-col items-center bg-surface-overlay rounded-xl shadow-lg border border-border-primary p-md mx-auto lg:mx-0"
                style={{ maxWidth: '538px' }}
            >
                <div className="w-full flex justify-center" onClick={focusHiddenInput} role="presentation">
                    <CRTWorker worker={worker} />
                </div>
                <div className="mt-md w-full">
                    <Actions
                        supportBS={supportBS}
                        onReset={useCallback(
                            (e) => {
                                e.preventDefault();
                                worker.postMessage({ data: 'Tab', type: WORKER_MESSAGES.KEY_DOWN });
                            },
                            [worker],
                        )}
                        onBS={useCallback(
                            (e) => {
                                e.preventDefault();
                                worker.postMessage({
                                    data: !supportBS,
                                    type: WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG,
                                });
                                setSupportBS((prev) => !prev);
                            },
                            [worker, supportBS],
                        )}
                        onSaveState={handleSaveState}
                        onLoadState={handleLoadState}
                        onPauseResume={handlePauseResume}
                        isPaused={isPaused}
                        onRefocus={focusHiddenInput}
                        cycleAccurateTiming={cycleAccurateTiming}
                        onCycleAccurateTiming={useCallback(
                            (e) => {
                                e.preventDefault();
                                worker.postMessage({
                                    data: !cycleAccurateTiming,
                                    type: WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING,
                                });
                                setCycleAccurateTiming((prev) => !prev);
                            },
                            [worker, cycleAccurateTiming],
                        )}
                    />
                </div>
            </div>

            {/* Right column */}
            <div className="flex-1 bg-surface-overlay rounded-xl shadow-lg border border-border-primary p-md flex flex-col mt-1 lg:mt-0 overflow-hidden">
                <div className="flex-none flex items-center justify-between mb-md">
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
                    <AlertBadges 
                        onInfoClick={() => setAlertPanelOpen(true)}
                        onWarnClick={() => setAlertPanelOpen(true)}
                        onErrorClick={() => setAlertPanelOpen(true)}
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
                            <InspectorView root={apple1Instance} worker={worker} />
                        </div>
                    )}
                    {rightTab === 'inspector' && !apple1Instance && (
                        <div className="p-4 text-red-400">Inspector not available - Apple1 instance not connected.</div>
                    )}
                    {rightTab === 'debugger' && apple1Instance && (
                        <div className="h-full" style={{ overflow: 'hidden' }}>
                            <DebuggerLayout 
                                root={apple1Instance} 
                                worker={worker} 
                                initialNavigation={pendingNavigation}
                                onNavigationHandled={() => setPendingNavigation(null)}
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
                    pointerEvents: 'none'
                }}
                tabIndex={0}
                aria-label="Hidden input for keyboard focus"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                readOnly
            />
            <AlertPanel 
                isOpen={alertPanelOpen}
                onClose={() => setAlertPanelOpen(false)}
            />
        </div>
    );
};