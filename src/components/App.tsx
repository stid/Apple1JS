import { JSX } from 'react';
import ErrorBoundary from './Error';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { DebuggerNavigationProvider } from '../contexts/DebuggerNavigationContext';
import { AppContent } from './AppContent';

type Props = {
    worker: Worker;
    apple1Instance?: IInspectableComponent | null;
};

const App = ({ worker, apple1Instance }: Props): JSX.Element => {
    return (
        <ErrorBoundary>
            <DebuggerNavigationProvider>
                <AppContent worker={worker} apple1Instance={apple1Instance} />
            </DebuggerNavigationProvider>
        </ErrorBoundary>
    );
};

export default App;