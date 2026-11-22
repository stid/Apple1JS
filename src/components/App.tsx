import { JSX } from 'react';
import ErrorBoundary from './Error';
import { DebuggerNavigationProvider } from '../contexts/DebuggerNavigationContext';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from './ToastContainer';
import { AppContent } from './AppContent';
import type { WorkerManager } from '../services/WorkerManager';

type Props = {
    workerManager: WorkerManager;
};

const App = ({ workerManager }: Props): JSX.Element => {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <DebuggerNavigationProvider>
                    <AppContent workerManager={workerManager} />
                </DebuggerNavigationProvider>
                <ToastContainer />
            </ToastProvider>
        </ErrorBoundary>
    );
};

export default App;
