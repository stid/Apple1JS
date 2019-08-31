import ReactDOM from 'react-dom';
import React from 'react';
import App from 'components/app';

const appleWorker = new Worker('js/AppleWorker.js');

window.addEventListener('keydown', (e: KeyboardEvent) => {
    appleWorker.postMessage({ data: e.key, type: 'keyDown' });
});

ReactDOM.render(<App worker={appleWorker} />, document.getElementById('app'));
