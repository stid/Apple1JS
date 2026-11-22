import Main from './components/Main';
import { createRoot } from 'react-dom/client';
import { loggingService } from './services/LoggingService';
import { workerManager } from './services/WorkerManager';

// The emulator itself lives in the worker. Nothing from src/core or the Apple1
// system is imported here: doing so (a second, never-running Apple1 used to be
// built for the Inspector) pulls the whole emulation core into the UI bundle.
const renderApp = () => {
    const container = document.getElementById('app');
    if (container) {
        createRoot(container).render(<Main workerManager={workerManager} />);
    } else {
        loggingService.error('App', 'App Container Not Found!');
    }
};

const main = async () => {
    await workerManager.initializeWorker();
    renderApp();
};

main();
