import Debugger from './Debugger';
import Info from './Info';
import ErrorBoundary from './Error';
import CRTWorker from './CRTWorker';

//import styled, { createGlobalStyle } from 'styled-components';
import { global, styled } from '@stitches/react';

const GlobalStyle = global({
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

const Title = () => <h3>Apple 1 :: JS Emulator - by =stid= v1.9.0</h3>;

type Props = {
    worker: Worker;
};
export default ({ worker }: Props): JSX.Element => {
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
