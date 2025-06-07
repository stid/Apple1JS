import React from 'react';

export type ActionsProps = {
    onReset: React.MouseEventHandler<HTMLAnchorElement>;
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    onShowDebug: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
    showDebug: boolean;
};

const Actions = ({ onReset, onBS, supportBS, showDebug, onShowDebug }: ActionsProps) => (
    <div>
        <a onClick={onReset} href="#">
            RESET
        </a>{' '}
        |{' '}
        <a onClick={onBS} href="#">
            SUPOPRT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>{' '}
        |{' '}
        <a onClick={onShowDebug} href="#">
            {showDebug ? 'HIDE DEBUG' : 'SHOW DEBUG'}
        </a>
    </div>
);

export default Actions;
