import Debugger from './Debugger';
import Info from './Info';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import { WORKER_MESSAGES } from '../apple1/TSTypes';
import Actions from './Actions';
import { useRef, useEffect, useState, useCallback, JSX } from 'react';
import ErrorBoundary from './Error';

type Props = {
    worker: Worker;
};

const App = ({ worker }: Props): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    // Right panel tab: 'info' or 'debug'
    const [rightTab, setRightTab] = useState<'info' | 'debug'>('info');
    const hiddenInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <ErrorBoundary>
            <div className="flex flex-col lg:flex-row w-full h-full gap-0 lg:gap-3 p-1 sm:p-1 md:px-2 md:py-1">
                {/* Left column: CRT, Actions */}
                <div
                    className="flex flex-col items-stretch bg-black/60 rounded-xl shadow-lg border border-neutral-800 px-1.5 py-1.5 md:px-2 md:py-2"
                    style={{ maxWidth: 720 }}
                >
                    <div className="w-full max-w-full overflow-x-auto" onClick={focusHiddenInput} role="presentation">
                        <CRTWorker worker={worker} />
                    </div>
                    <div className="mt-2 mb-2 flex justify-start">
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
                        />
                    </div>
                </div>
                {/* Right column: Info/Debug sub-tabs */}
                <div className="w-full min-w-0 flex-1 bg-black/60 rounded-xl shadow-lg border border-neutral-800 px-1.5 py-1.5 md:px-2 md:py-2 flex flex-col justify-start mx-auto lg:mx-0 mt-1 lg:mt-0">
                    <div className="flex gap-2 mb-2 mt-2">
                        <button
                            className={`px-3 py-1 rounded ${rightTab === 'info' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                            onClick={() => setRightTab('info')}
                        >
                            Guide
                        </button>
                        <button
                            className={`px-3 py-1 rounded ${rightTab === 'debug' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                            onClick={() => setRightTab('debug')}
                        >
                            Debug
                        </button>
                    </div>
                    <div className="w-full mt-2 sm:text-xs md:text-sm">
                        {rightTab === 'info' && <Info />}
                        {rightTab === 'debug' && <Debugger worker={worker} />}
                    </div>
                </div>
            </div>
            <input
                type="text"
                ref={hiddenInputRef}
                className="hidden-input-accessible"
                aria-hidden="true"
                tabIndex={-1}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    zIndex: -1,
                }}
            />
        </ErrorBoundary>
    );
};

export default App;
