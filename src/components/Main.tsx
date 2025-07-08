import React from 'react';
import App from './App';
import { IInspectableComponent } from '../core/types';
import { APP_VERSION } from '../version';
import { typography, color, spacing } from '../styles/utils';

interface MainProps {
    worker: Worker;
    apple1Instance: IInspectableComponent | null;
}

const Main: React.FC<MainProps> = ({ worker, apple1Instance }) => {
    return (
        <div style={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            <header style={{
                flexShrink: 0,
                width: '100%',
                backgroundColor: color('background.surface'),
                borderBottom: `1px solid ${color('border.primary')}`,
                padding: `${spacing('md')} ${spacing('lg')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}>
                <h1 style={{
                    ...typography.base,
                    color: color('text.accent'),
                    fontWeight: 500,
                    letterSpacing: '0.025em',
                }}>
                    Apple 1 :: JS Emulator <span style={{
                        color: color('text.secondary'),
                        fontWeight: 400,
                    }}>- by =stid=</span>{' '}
                    <span style={{
                        ...typography.xs,
                        color: color('text.muted'),
                    }}>v{APP_VERSION}</span>
                </h1>
            </header>
            <div style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
                minHeight: 0,
                padding: `${spacing('lg')} 0`,
            }}>
                <App worker={worker} apple1Instance={apple1Instance} />
            </div>
        </div>
    );
};

export default Main;
