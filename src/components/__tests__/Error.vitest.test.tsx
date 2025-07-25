import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import ErrorBoundary from '../Error';
const MockComponent = () => {
    const [throwError, setThrowError] = React.useState(false);

    if (throwError) {
        throw new Error('Test error');
    }

    return (
        <button type="button" onClick={() => setThrowError(true)}>
            Throw Error
        </button>
    );
};

describe('ErrorBoundary', () => {
    afterEach(() => {
        vi.spyOn(console, 'error').mockRestore();
    });

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('renders without error', () => {
        render(
            <ErrorBoundary>
                <MockComponent />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Throw Error')).toBeInTheDocument();
    });

    test('renders error message when child component throws an error', () => {
        render(
            <ErrorBoundary>
                <MockComponent />
            </ErrorBoundary>,
        );

        fireEvent.click(screen.getByText('Throw Error'));

        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument();
    });

    test('logs error to console when componentDidCatch is called', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        render(
            <ErrorBoundary>
                <MockComponent />
            </ErrorBoundary>,
        );

        fireEvent.click(screen.getByText('Throw Error'));

        expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
});
