import { render } from 'react-dom';
import App from 'components/App';
import { WORKER_MESSAGES } from 'apple1/TSTypes';
//import { unstable_trace as trace } from 'scheduler/tracing';

const appleWorker = new Worker('Apple.worker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
    e.preventDefault();
});

//trace('initial render', performance.now(), () => render(<App worker={appleWorker} />, document.getElementById('app')));
render(<App worker={appleWorker} />, document.getElementById('app'));
