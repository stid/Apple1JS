import { describe, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Actions, { ActionsProps } from '../Actions';

describe('Actions component', () => {
    const props: ActionsProps = {
        onReset: vi.fn(),
        onBS: vi.fn(),
        supportBS: true,
        onSaveState: vi.fn(),
        onLoadState: vi.fn(),
        onPauseResume: vi.fn(),
        isPaused: false,
        onRefocus: vi.fn(),
        onCycleAccurateTiming: vi.fn(),
        cycleAccurateTiming: true,
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should render two anchor elements with the correct text', () => {
        render(<Actions {...props} />);
        const resetAnchor = screen.getByText('RESET');
        const bsAnchor = screen.getByText('SUPPORT BACKSPACE [ON]');
        expect(resetAnchor).toBeInTheDocument();
        expect(bsAnchor).toBeInTheDocument();
    });

    it('should call the onReset prop when the "RESET" anchor is clicked', () => {
        render(<Actions {...props} />);
        const resetAnchor = screen.getByText('RESET');
        fireEvent.click(resetAnchor);
        expect(props.onReset).toHaveBeenCalledTimes(1);
    });

    it('should call the onBS prop when the "SUPPORT BACKSPACE" anchor is clicked', () => {
        render(<Actions {...props} />);
        const bsAnchor = screen.getByText('SUPPORT BACKSPACE [ON]');
        fireEvent.click(bsAnchor);
        expect(props.onBS).toHaveBeenCalledTimes(1);
    });

    it('should show the correct text in the "SUPPORT BACKSPACE" anchor depending on the supportBS prop', () => {
        const { rerender } = render(<Actions {...props} />);
        let bsAnchor = screen.getByText('SUPPORT BACKSPACE [ON]');
        expect(bsAnchor).toBeInTheDocument();

        rerender(<Actions {...props} supportBS={false} />);
        bsAnchor = screen.getByText('SUPPORT BACKSPACE [OFF]');
        expect(bsAnchor).toBeInTheDocument();
    });

    it('should show the correct text in the "PAUSE/RESUME" anchor depending on the isPaused prop', () => {
        const { rerender } = render(<Actions {...props} />);
        let pauseAnchor = screen.getByText('PAUSE');
        expect(pauseAnchor).toBeInTheDocument();

        rerender(<Actions {...props} isPaused={true} />);
        pauseAnchor = screen.getByText('RESUME');
        expect(pauseAnchor).toBeInTheDocument();
    });

    it('should call the onPauseResume prop when the "PAUSE/RESUME" anchor is clicked', () => {
        render(<Actions {...props} />);
        const pauseAnchor = screen.getByText('PAUSE');
        fireEvent.click(pauseAnchor);
        expect(props.onPauseResume).toHaveBeenCalledTimes(1);
    });

    it('should show the correct text in the "CYCLE TIMING" anchor depending on the cycleAccurateTiming prop', () => {
        const { rerender } = render(<Actions {...props} />);
        let timingAnchor = screen.getByText('CYCLE TIMING [ACCURATE]');
        expect(timingAnchor).toBeInTheDocument();

        rerender(<Actions {...props} cycleAccurateTiming={false} />);
        timingAnchor = screen.getByText('CYCLE TIMING [FAST]');
        expect(timingAnchor).toBeInTheDocument();
    });

    it('should call the onCycleAccurateTiming prop when the "CYCLE TIMING" anchor is clicked', () => {
        render(<Actions {...props} />);
        const timingAnchor = screen.getByText('CYCLE TIMING [ACCURATE]');
        fireEvent.click(timingAnchor);
        expect(props.onCycleAccurateTiming).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveState when SAVE STATE is clicked', () => {
        render(<Actions {...props} />);
        const saveAnchor = screen.getByText('SAVE STATE');
        fireEvent.click(saveAnchor);
        expect(props.onSaveState).toHaveBeenCalledTimes(1);
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
    });

    it('should call onLoadState when a file is selected', () => {
        render(<Actions {...props} />);
        const loadLabel = screen.getByText('LOAD STATE');
        const input = loadLabel.querySelector('input[type="file"]') as HTMLInputElement;
        
        const file = new File(['{}'], 'state.json', { type: 'application/json' });
        const changeEvent = { target: { files: [file] } };
        
        fireEvent.change(input, changeEvent);
        expect(props.onLoadState).toHaveBeenCalledTimes(1);
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
    });

    it('should handle hover states for buttons', () => {
        render(<Actions {...props} />);
        const resetAnchor = screen.getByText('RESET');
        
        // Test mouse enter
        fireEvent.mouseEnter(resetAnchor);
        // The style should change but we can't directly test inline styles in jest-dom
        
        // Test mouse leave
        fireEvent.mouseLeave(resetAnchor);
        
        // Test other buttons for hover
        const pauseAnchor = screen.getByText('PAUSE');
        fireEvent.mouseEnter(pauseAnchor);
        fireEvent.mouseLeave(pauseAnchor);
        
        const saveAnchor = screen.getByText('SAVE STATE');
        fireEvent.mouseEnter(saveAnchor);
        fireEvent.mouseLeave(saveAnchor);
        
        const loadLabel = screen.getByText('LOAD STATE');
        fireEvent.mouseEnter(loadLabel);
        fireEvent.mouseLeave(loadLabel);
        
        const bsAnchor = screen.getByText('SUPPORT BACKSPACE [ON]');
        fireEvent.mouseEnter(bsAnchor);
        fireEvent.mouseLeave(bsAnchor);
        
        const timingAnchor = screen.getByText('CYCLE TIMING [ACCURATE]');
        fireEvent.mouseEnter(timingAnchor);
        fireEvent.mouseLeave(timingAnchor);
        
        // Verify all elements still exist after hover interactions
        expect(resetAnchor).toBeInTheDocument();
        expect(pauseAnchor).toBeInTheDocument();
        expect(saveAnchor).toBeInTheDocument();
        expect(loadLabel).toBeInTheDocument();
        expect(bsAnchor).toBeInTheDocument();
        expect(timingAnchor).toBeInTheDocument();
    });

    it('should call onRefocus when any action is triggered', () => {
        render(<Actions {...props} />);
        
        // Reset
        fireEvent.click(screen.getByText('RESET'));
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
        
        // Pause
        fireEvent.click(screen.getByText('PAUSE'));
        expect(props.onRefocus).toHaveBeenCalledTimes(2);
        
        // Backspace
        fireEvent.click(screen.getByText('SUPPORT BACKSPACE [ON]'));
        expect(props.onRefocus).toHaveBeenCalledTimes(3);
        
        // Timing
        fireEvent.click(screen.getByText('CYCLE TIMING [ACCURATE]'));
        expect(props.onRefocus).toHaveBeenCalledTimes(4);
    });

    it('should render file input with correct attributes', () => {
        render(<Actions {...props} />);
        const loadLabel = screen.getByText('LOAD STATE');
        const input = loadLabel.querySelector('input[type="file"]') as HTMLInputElement;
        
        expect(input).toBeInTheDocument();
        expect(input.accept).toBe('application/json');
        expect(input.style.display).toBe('none');
    });

    it('should have correct tabIndex on interactive elements', () => {
        render(<Actions {...props} />);
        
        const interactiveElements = [
            screen.getByText('RESET'),
            screen.getByText('PAUSE'),
            screen.getByText('SAVE STATE'),
            screen.getByText('LOAD STATE'),
            screen.getByText('SUPPORT BACKSPACE [ON]'),
            screen.getByText('CYCLE TIMING [ACCURATE]')
        ];
        
        interactiveElements.forEach(element => {
            expect(element).toHaveAttribute('tabIndex', '0');
        });
    });
});