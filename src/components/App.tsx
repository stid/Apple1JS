import Debugger from './Debugger';
import Info from './Info';
import ErrorBoundary from './Error';
import CRTWorker from './CRTWorker';
import { APPPLEJS_VER } from 'const';

import { globalCss, styled } from '@stitches/react';

const GlobalStyle = globalCss({
    body: {
        backgroundColor: 'black',
        color: '#BBB',
        fontSize: '14px',
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    },
});

const LayoutRow = styled('div', {
    display: 'flex',
});

const LayoutColumn = styled('div', {
    flex: '50%',
    padding: '20px',
});

const Title = () => (
    <h3>
        Apple 1 :: JS Emulator - by =stid= v{APPPLEJS_VER.MAJIOR}.{APPPLEJS_VER.MINOR}.{APPPLEJS_VER.REVISION}
    </h3>
);

type Props = {
    worker: Worker;
};

const App = ({ worker }: Props): JSX.Element => {
    GlobalStyle();
    return (
        <ErrorBoundary>
            <LayoutRow>
                <LayoutColumn>
                    <Title />
                    <CRTWorker worker={worker} />
                </LayoutColumn>
                <LayoutColumn>
                    <Info />
                </LayoutColumn>
            </LayoutRow>
            <LayoutRow>
                <Debugger worker={worker} />
            </LayoutRow>
        </ErrorBoundary>
    );
};

export default App;
