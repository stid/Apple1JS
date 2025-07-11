import Main from './components/Main';
import { createRoot } from 'react-dom/client';
import { onCLS, onLCP } from 'web-vitals';
import { LoggingProvider } from './contexts/LoggingContext';
import { loggingService } from './services/LoggingService';

const createAppleWorker = (): Worker => {
    return new Worker(new URL('./apple1/Apple.worker.ts', import.meta.url), { type: 'module' });
};

// Import Apple1 and dependencies for inspector
import Apple1 from './apple1';
import WebCRTVideo from './apple1/WebCRTVideo';
import WebWorkerKeyboard from './apple1/WebKeyboard';

let apple1Instance: Apple1 | null = null;

const renderApp = (worker: Worker) => {
    const container = document.getElementById('app');
    if (container) {
        // Create a real Apple1 instance for inspector (not the worker one)
        if (!apple1Instance) {
            const video = new WebCRTVideo();
            const keyboard = new WebWorkerKeyboard();
            apple1Instance = new Apple1({ video, keyboard });
        }
        const root = createRoot(container);
        root.render(
            <LoggingProvider>
                <Main worker={worker} apple1Instance={apple1Instance} />
            </LoggingProvider>
        );
    } else {
        loggingService.error('App', 'App Container Not Found!');
    }
};

const initWebVitals = () => {
    onCLS((metric) => loggingService.info('WebVitals', `CLS: ${JSON.stringify(metric)}`));
    onLCP((metric) => loggingService.info('WebVitals', `LCP: ${JSON.stringify(metric)}`));
};

const main = () => {
    const appleWorker = createAppleWorker();
    renderApp(appleWorker);
    initWebVitals();
};

main();
