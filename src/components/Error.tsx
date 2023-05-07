import { Component, ErrorInfo, ReactNode } from 'react';

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
        console.error('Uncaught error:', error, errorInfo);
    };

    render() {
        const { hasError } = this.state;
        const { children } = this.props;

        if (hasError) {
            return (
                <div className="bg-red-100 p-4">
                    <h1 className="text-red-600 text-xl font-semibold mb-2">Oops! Something went wrong</h1>
                    <p className="text-red-500">Please try refreshing the page.</p>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
