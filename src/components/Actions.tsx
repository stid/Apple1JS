import React, { useState } from 'react';
import { spacing, buttonVariants } from '../styles/utils';

export type ActionsProps = {
    onReset: React.MouseEventHandler<HTMLAnchorElement>;
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
    onSaveState: React.MouseEventHandler<HTMLAnchorElement>;
    onLoadState: React.ChangeEventHandler<HTMLInputElement>;
    onPauseResume: React.MouseEventHandler<HTMLAnchorElement>;
    isPaused: boolean;
    onRefocus: () => void;
    onCycleAccurateTiming: React.MouseEventHandler<HTMLAnchorElement>;
    cycleAccurateTiming: boolean;
};

const Actions = ({ onReset, onBS, supportBS, onSaveState, onLoadState, onPauseResume, isPaused, onRefocus, onCycleAccurateTiming, cycleAccurateTiming }: ActionsProps) => {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    
    return (
    <nav style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing('sm'),
        justifyContent: 'center',
    }}>
        {/* Control Actions Group */}
        <a
            onClick={(e) => {
                onReset(e);
                onRefocus();
            }}
            href="#"
            style={buttonVariants.success(hoveredButton === 'reset')}
            onMouseEnter={() => setHoveredButton('reset')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            RESET
        </a>
        <a
            onClick={(e) => {
                onPauseResume(e);
                onRefocus();
            }}
            href="#"
            style={buttonVariants.success(hoveredButton === 'pause')}
            onMouseEnter={() => setHoveredButton('pause')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            {isPaused ? 'RESUME' : 'PAUSE'}
        </a>
        
        {/* State Management Group */}
        <a
            onClick={(e) => {
                onSaveState(e);
                onRefocus();
            }}
            href="#"
            style={buttonVariants.address(hoveredButton === 'save')}
            onMouseEnter={() => setHoveredButton('save')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            SAVE STATE
        </a>
        <label
            style={buttonVariants.address(hoveredButton === 'load')}
            onMouseEnter={() => setHoveredButton('load')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            LOAD STATE
            <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                    onLoadState(e);
                    onRefocus();
                }}
            />
        </label>
        
        {/* Configuration Group */}
        <a
            onClick={(e) => {
                onBS(e);
                onRefocus();
            }}
            href="#"
            style={buttonVariants.warning(hoveredButton === 'backspace')}
            onMouseEnter={() => setHoveredButton('backspace')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            SUPPORT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>
        <a
            onClick={(e) => {
                onCycleAccurateTiming(e);
                onRefocus();
            }}
            href="#"
            style={buttonVariants.warning(hoveredButton === 'timing')}
            onMouseEnter={() => setHoveredButton('timing')}
            onMouseLeave={() => setHoveredButton(null)}
            tabIndex={0}
        >
            CYCLE TIMING [{cycleAccurateTiming ? 'ACCURATE' : 'FAST'}]
        </a>
    </nav>
    );
};

export default Actions;
