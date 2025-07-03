import '@testing-library/jest-dom/jest-globals';
import { fireEvent, render, screen } from '@testing-library/react';
import Actions, { ActionsProps } from '../Actions';

describe('Actions component', () => {
    const props: ActionsProps = {
        onReset: jest.fn(),
        onBS: jest.fn(),
        supportBS: true,
        onSaveState: jest.fn(),
        onLoadState: jest.fn(),
        onPauseResume: jest.fn(),
        isPaused: false,
        onRefocus: jest.fn(),
    };

    afterEach(() => {
        jest.clearAllMocks();
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
});