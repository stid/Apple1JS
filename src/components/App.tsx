import Debugger from './Debugger';
import Info from './Info';
import CRTWorker from './CRTWorker';
import { CONFIG } from '../config';
import { APP_VERSION } from '../version';
import { WORKER_MESSAGES } from '../apple1/TSTypes';
import Actions from './Actions';
import React, { useRef, useEffect, useState } from 'react';
import ErrorBoundary from './Error';

const Title = () => <h3>Apple 1 :: JS Emulator - by =stid= v{APP_VERSION}</h3>;

const LayoutRow = ({ children }: { children?: React.ReactNode }) => <div className="flex-1 p-6">{children}</div>;

type Props = {
    worker: Worker;
};
const App = ({ worker }: Props): JSX.Element => {
    const [supportBS, setSupportBS] = useState<boolean>(CONFIG.CRT_SUPPORT_BS);
    const [showDebug, setShowDebug] = useState<boolean>(false);

    const hiddenInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            worker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
            e.preventDefault();
        };

        const hiddenInput = hiddenInputRef.current;
        if (hiddenInput) {
            hiddenInput.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (hiddenInput) {
                hiddenInput.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [worker]);

    const focusHiddenInput = () => {
        const hiddenInput = hiddenInputRef.current;
        if (hiddenInput) {
            hiddenInput.style.opacity = '0';
            hiddenInput.focus();
        }
    };

    return (
        <ErrorBoundary>
            <div className="flex">
                <LayoutRow>
                    <Title />
                    <div onClick={focusHiddenInput}>
                        <CRTWorker worker={worker} />
                    </div>

                    <div className="p-0 mt-1">
                        <Actions
                            supportBS={supportBS}
                            onReset={(e) => {
                                e.preventDefault();
                                worker.postMessage({ data: 'Tab', type: WORKER_MESSAGES.KEY_DOWN });
                            }}
                            onBS={(e) => {
                                e.preventDefault();
                                worker.postMessage({
                                    data: !supportBS,
                                    type: WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG,
                                });
                                setSupportBS(!supportBS);
                            }}
                            showDebug={showDebug}
                            onShowDebug={(e) => {
                                e.preventDefault();
                                setShowDebug(!showDebug);
                            }}
                        />
                    </div>
                </LayoutRow>
                <LayoutRow>
                    <Info />
                </LayoutRow>
            </div>
            {showDebug && (
                <div className="flex">
                    <Debugger worker={worker} />
                </div>
            )}

            <input
                type="text"
                ref={hiddenInputRef}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
        </ErrorBoundary>
    );
};

export default App;
