import { JSX } from 'react';
import ErrorBoundary from './Error';
import { IInspectableComponent } from '../core/types';
import { DebuggerNavigationProvider } from '../contexts/DebuggerNavigationContext';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from './ToastContainer';
import { AppContent } from './AppContent';
import type { WorkerManager } from '../services/WorkerManager';

type Props = {
    workerManager: WorkerManager;
    apple1Instance?: IInspectableComponent | null;
};

const App = ({ workerManager, apple1Instance }: Props): JSX.Element => {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <DebuggerNavigationProvider>
                    <AppContent
                        workerManager={workerManager}
                        {...(apple1Instance !== undefined && { apple1Instance })}
                    />
                </DebuggerNavigationProvider>
                <ToastContainer />
            </ToastProvider>
        </ErrorBoundary>
    );
};

export default App;
