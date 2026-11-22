import { Component, ErrorInfo, ReactNode } from 'react';
import { loggingService } from '../services/LoggingService';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    componentDidCatch = (error: Error, errorInfo: ErrorInfo) => {
        loggingService.error('ErrorBoundary', `Uncaught error: ${error}\n${errorInfo.componentStack}`);
    };

    render() {
        const { hasError } = this.state;
        const { children } = this.props;

        if (hasError) {
            return (
                <div className="m-md p-md rounded-lg border border-error/60 bg-error/15">
                    <h1 className="text-error text-lg font-semibold tracking-tight mb-2">Something went wrong</h1>
                    <p className="text-text-secondary">Reload the page to restart the emulator.</p>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
