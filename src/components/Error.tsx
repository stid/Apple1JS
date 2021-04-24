import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static getDerivedStateFromError(_: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public render() {
        if (this.state.hasError) {
            return <h1>Sorry.. there was an error</h1>;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
