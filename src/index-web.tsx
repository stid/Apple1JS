import App from './components/App';
import { WORKER_MESSAGES } from './apple1/TSTypes';
import { createRoot } from 'react-dom/client';
import { onCLS, onFID, onLCP } from 'web-vitals';

const createAppleWorker = () => {
    const appleWorker = new Worker(new URL('./apple1/Apple.worker.ts', import.meta.url), { type: 'module' });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
        e.preventDefault();
    });

    return appleWorker;
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
    onFID(console.log);
    onLCP(console.log);
};

const main = () => {
    const appleWorker = createAppleWorker();
    renderApp(appleWorker);
    initWebVitals();
};

main();
