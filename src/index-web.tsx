import App from 'components/App';
import { WORKER_MESSAGES } from 'apple1/TSTypes';
import { createRoot } from 'react-dom/client';

const appleWorker = new Worker('Apple.worker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
    e.preventDefault();
});

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App worker={appleWorker} />);
