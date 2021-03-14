import ReactDOM from 'react-dom';
import App from 'components/app';
import { WORKER_MESSAGES } from 'apple1/TSTypes';

const appleWorker = new Worker('js/Apple.worker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
});

ReactDOM.render(<App worker={appleWorker} />, document.getElementById('app'));

// React Concurrent Mode
// ReactDOM.unstable_createRoot( document.getElementById('app')).render(<App worker={appleWorker} />);