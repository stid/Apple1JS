import React from 'react';
import styled from 'styled-components';
import { WORKER_MESSAGES, DebugData } from 'apple1/TSTypes';

const DebuggerContainer = styled.div`
    padding-top: 20px;
    font-size: 14px;
`;

const Debugger = ({ worker }: { worker: Worker }) => {
    const [debugInfo, setDebugInfo] = React.useState<DebugData>({});

    React.useEffect(() => {
        setTimeout(() => {
            worker.postMessage({ data: {}, type: WORKER_MESSAGES.DEBUG_INFO });
        }, 500);
    });

    React.useEffect(() => {
        worker.addEventListener('message', e => {
            const { data, type }: { data: DebugData; type: WORKER_MESSAGES } = e.data;
            switch (type) {
                case WORKER_MESSAGES.DEBUG_INFO:
                    setDebugInfo(data as DebugData);
                    break;
            }
        });
    }, [worker]);

    return (
        <DebuggerContainer>
            {Object.keys(debugInfo).map(key => (
                <DebugDomain key={key} domainKey={key} domainData={debugInfo[key]} />
            ))}
        </DebuggerContainer>
    );
};

const DebugDomainTitle = styled.h4`
    margin-bottom: 5px;
    color: #aaa;
`;
const DebugDomainInfo = styled.div`
    color: #607d8b;
`;
interface DebugDomainProps {
    domainKey: string;
    domainData: { [key: string]: string | number | boolean };
}
const DebugDomain = ({ domainKey, domainData }: DebugDomainProps) => (
    <>
        <DebugDomainTitle>{domainKey}</DebugDomainTitle>
        <DebugDomainInfo>
            {Object.keys(domainData).map(key => (
                <div key={key}>{`${key}: ${domainData[key]}`}</div>
            ))}
        </DebugDomainInfo>
    </>
);

export default Debugger;
