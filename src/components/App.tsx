import Debugger from './Debugger';
import Info from './Info';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import { APP_VERSION } from '../version';
import { WORKER_MESSAGES } from '../apple1/TSTypes';
import Actions from './Actions';
import React, { useRef, useEffect, useState, useCallback, JSX } from 'react';
import ErrorBoundary from './Error';

const Title = () => <h3>Apple 1 :: JS Emulator - by =stid= v{APP_VERSION}</h3>;

const LayoutRow = ({ children }: { children?: React.ReactNode }) => <div className="flex-1 p-4 sm:p-6">{children}</div>;

type Props = {
    worker: Worker;
};

const App = ({ worker }: Props): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    const [showDebug, setShowDebug] = useState<boolean>(true);
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
            <div className="flex flex-col lg:flex-row">
                <LayoutRow>
                    <Title />
                    <div className="w-full max-w-full overflow-x-auto" onClick={focusHiddenInput} role="presentation">
                        <CRTWorker worker={worker} />
                    </div>
                    <div className="p-0 mt-1">
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
                            showDebug={showDebug}
                            onShowDebug={useCallback((e) => {
                                e.preventDefault();
                                setShowDebug((prev) => !prev);
                            }, [])}
                        />
                    </div>
                </LayoutRow>
                <LayoutRow>
                    <div className="sm:text-xs md:text-sm p-2 sm:p-4 md:p-6">
                        <Info />
                    </div>
                </LayoutRow>
            </div>
            {showDebug && (
                <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:text-xs md:text-sm p-2 sm:p-4 md:p-6">
                        <Debugger worker={worker} />
                    </div>
                </div>
            )}
            <input
                type="text"
                ref={hiddenInputRef}
                className="hidden-input-accessible"
                aria-hidden="true"
                tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
        </ErrorBoundary>
    );
};

export default App;
