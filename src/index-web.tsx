import ReactDOM from 'react-dom';
import App from 'components/App';
import { WORKER_MESSAGES } from 'apple1/TSTypes';

const appleWorker = new Worker('Apple.worker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
    e.preventDefault();
});

ReactDOM.render(<App worker={appleWorker} />, document.getElementById('app'));
