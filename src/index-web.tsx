import App from './components/App';
import { createRoot } from 'react-dom/client';
import { onCLS, onLCP } from 'web-vitals';

const createAppleWorker = (): Worker => {
    return new Worker(new URL('./apple1/Apple.worker.ts', import.meta.url), { type: 'module' });
};

const renderApp = (worker: Worker) => {
    const container = document.getElementById('app');
    if (container) {
        const root = createRoot(container);
        root.render(<App worker={worker} />);
    } else {
        console.error('ERROR: App Container Not Found!');
    }
};

const initWebVitals = () => {
    onCLS(console.log);
    onLCP(console.log);
};

const main = () => {
    const appleWorker = createAppleWorker();
    renderApp(appleWorker);
    initWebVitals();
};

main();
