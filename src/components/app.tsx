import Debugger from './Debugger';
import Info from './Info';
import ErrorBoundary from './Error';
import CRTWorker from './CRTWorker';

import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    background-color:black;
    color: #BBB;
    font-size: 14px;
    font-family: Menlo, Monaco, "Courier New", monospace;
  }
`;

const LayoutRow = styled.div`
    display: flex;
`;

const LayoutColumn = styled.div`
    flex: 50%;
    padding: 20px;
`;

const Title = () => <h3>Apple 1 :: JS Emulator - by =stid= v1.6.3</h3>;

type Props = {
    worker: Worker;
};
export default ({ worker }: Props): JSX.Element => {
    return (
        <ErrorBoundary>
            <GlobalStyle />
            <LayoutRow>
                <LayoutColumn>
                    <Title />
                    <CRTWorker worker={worker} />
                    <Debugger worker={worker} />
                </LayoutColumn>
                <LayoutColumn>
                    <Info />
                </LayoutColumn>
            </LayoutRow>
        </ErrorBoundary>
    );
};
