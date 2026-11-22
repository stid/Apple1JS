import { describe, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Actions, { ActionsProps } from '../Actions';

// Actions is now a settings-only panel: Save/Load state + Backspace/Timing toggles.
// Run / pause / step / reset and the engine switch moved to the always-visible
// execution bar (see ExecutionControlsCluster + AppContent).
describe('Actions component (settings panel)', () => {
    const props: ActionsProps = {
        onBS: vi.fn(),
        supportBS: true,
        onSaveState: vi.fn(),
        onLoadState: vi.fn(),
        onRefocus: vi.fn(),
        onCycleAccurateTiming: vi.fn(),
        cycleAccurateTiming: true,
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the retained settings controls', () => {
        render(<Actions {...props} />);
        expect(screen.getByRole('switch', { name: /Backspace/ })).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /Cycle timing/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save state' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Load state' })).toBeInTheDocument();
    });

    it('no longer renders execution or engine controls (they live in the bar)', () => {
        render(<Actions {...props} />);
        expect(screen.queryByText(/^RESET$/i)).toBeNull();
        expect(screen.queryByText(/PAUSE|RESUME/i)).toBeNull();
        expect(screen.queryByText(/ENGINE/i)).toBeNull();
    });

    it('calls onBS and reports its state by supportBS', () => {
        const { rerender } = render(<Actions {...props} />);
        const backspace = screen.getByRole('switch', { name: /Backspace/ });
        expect(backspace).toHaveAttribute('aria-checked', 'true');
        expect(backspace).toHaveTextContent('on');
        fireEvent.click(backspace);
        expect(props.onBS).toHaveBeenCalledTimes(1);
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
        rerender(<Actions {...props} supportBS={false} />);
        expect(backspace).toHaveAttribute('aria-checked', 'false');
        expect(backspace).toHaveTextContent('off');
    });

    it('calls onCycleAccurateTiming and reports its mode', () => {
        const { rerender } = render(<Actions {...props} />);
        const timing = screen.getByRole('switch', { name: /Cycle timing/ });
        expect(timing).toHaveAttribute('aria-checked', 'true');
        expect(timing).toHaveTextContent('accurate');
        fireEvent.click(timing);
        expect(props.onCycleAccurateTiming).toHaveBeenCalledTimes(1);
        rerender(<Actions {...props} cycleAccurateTiming={false} />);
        expect(timing).toHaveAttribute('aria-checked', 'false');
        expect(timing).toHaveTextContent('fast');
    });

    it('calls onSaveState and onRefocus when Save state is clicked', () => {
        render(<Actions {...props} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save state' }));
        expect(props.onSaveState).toHaveBeenCalledTimes(1);
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
    });

    it('calls onLoadState when a file is selected', () => {
        const { container } = render(<Actions {...props} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['{}'], 'state.json', { type: 'application/json' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(props.onLoadState).toHaveBeenCalledTimes(1);
        expect(props.onRefocus).toHaveBeenCalledTimes(1);
    });

    it('triggers the hidden file input when Load state is clicked', () => {
        const { container } = render(<Actions {...props} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const clickSpy = vi.spyOn(input, 'click');
        fireEvent.click(screen.getByRole('button', { name: 'Load state' }));
        expect(clickSpy).toHaveBeenCalledTimes(1);
        clickSpy.mockRestore();
    });

    it('colours the Backspace readout by its ON/OFF state', () => {
        const { rerender } = render(<Actions {...props} supportBS={true} />);
        expect(screen.getByText('on')).toHaveClass('text-toggle-active');
        rerender(<Actions {...props} supportBS={false} />);
        expect(screen.getByText('off')).toHaveClass('text-toggle-inactive');
    });

    it('renders the file input with correct attributes', () => {
        const { container } = render(<Actions {...props} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.accept).toBe('application/json');
        expect(input.style.display).toBe('none');
    });
});
