//import * as ReactDOM from 'react-dom';
import App from 'components/App';
import { WORKER_MESSAGES } from 'apple1/TSTypes';
import { unstable_trace as trace } from 'scheduler/tracing';
import { render } from 'react-dom';

const appleWorker = new Worker('Apple.worker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: WORKER_MESSAGES.KEY_DOWN });
    e.preventDefault();
});

// const container = document.getElementById('app');
// const root = ReactDOM.createRoot(container);
// root.render(<App worker={appleWorker} />);

trace('initial render', performance.now(), () => render(<App worker={appleWorker} />, document.getElementById('app')));
// render(<App worker={appleWorker} />, document.getElementById('app'));
