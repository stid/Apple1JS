import React, { useRef, useEffect, useState, useCallback, JSX } from 'react';
import Info from './Info';
import InspectorView from './InspectorView';
import Disassembler from './Disassembler';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import { WORKER_MESSAGES, LogMessageData } from '../apple1/TSTypes';
import Actions from './Actions';
import ErrorBoundary from './Error';
import StatusPanel from './StatusPanel';
import { useLogging } from '../contexts/LoggingContext';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

type Props = {
    worker: Worker;
    apple1Instance?: IInspectableComponent | null;
};

const App = ({ worker, apple1Instance }: Props): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [cycleAccurateTiming, setCycleAccurateTiming] = useState<boolean>(true);
    // Right panel tab: 'info', 'inspector', or 'disassembler'
    const [rightTab, setRightTab] = useState<'info' | 'inspector' | 'disassembler'>('info');
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const { addMessage } = useLogging();

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
        (e: ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            // Optionally, add a debug flag if you want to keep this log
            // console.log('Pasting:', pastedText);
            pastedText.split('').forEach((char, index) => {
                setTimeout(() => {
                    const keyToSend = char === '\n' || char === '\r' ? 'Enter' : char;
                    worker.postMessage({ data: keyToSend, type: WORKER_MESSAGES.KEY_DOWN });
                }, index * 160);
            });
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
            }
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => {
            worker.removeEventListener('message', handleWorkerMessage);
        };
    }, [worker, addMessage]);

    // --- State Save/Load Handlers ---
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
            setIsPaused((prev) => !prev);
        },
        [worker, isPaused],
    );

    return (
        <ErrorBoundary>
            <div className="flex flex-col lg:flex-row w-full lg:h-full gap-0 lg:gap-3 p-1 sm:p-1 md:px-2 md:py-1 lg:overflow-hidden lg:justify-center">
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
                {/* Right column: Guide/Inspector tabs */}
                <div 
                    className="w-full bg-surface-overlay rounded-xl shadow-lg border border-border-primary p-md flex flex-col mx-auto lg:mx-0 mt-1 lg:mt-0 lg:overflow-hidden"
                    style={{ 
                        maxWidth: '680px' // Wider for better debug info display
                    }}
                >
                    <StatusPanel />
                    <div className="flex-none flex gap-sm mb-md">
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
                            Guide
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
                                rightTab === 'disassembler' 
                                    ? 'bg-text-accent text-black border-text-accent' 
                                    : 'bg-text-accent/10 text-text-accent border-text-accent/30 hover:bg-text-accent/20 hover:border-text-accent'
                            }`}
                            onClick={() => {
                                setRightTab('disassembler');
                                focusHiddenInput();
                            }}
                        >
                            Disassembler
                        </button>
                    </div>
                    <div className="lg:flex-1 flex flex-col w-full sm:text-xs md:text-sm lg:overflow-hidden lg:min-h-0">
                        {rightTab === 'info' && (
                            <div className="lg:flex-1 lg:overflow-auto">
                                <Info />
                            </div>
                        )}
                        {rightTab === 'inspector' && apple1Instance && (
                            <div className="lg:flex-1 lg:overflow-hidden lg:min-h-0">
                                <InspectorView root={apple1Instance} worker={worker} />
                            </div>
                        )}
                        {rightTab === 'inspector' && !apple1Instance && (
                            <div className="p-4 text-red-400">Inspector not available - Apple1 instance not connected.</div>
                        )}
                        {rightTab === 'disassembler' && (
                            <div className="flex-1 min-h-0">
                                <Disassembler worker={worker} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <input
                type="text"
                ref={hiddenInputRef}
                className="hidden-input-accessible"
                tabIndex={0}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                    overflow: 'hidden',
                    zIndex: 1,
                }}
            />
        </ErrorBoundary>
    );
};

export default App;
