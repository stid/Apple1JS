import React from 'react';

interface SpinnerProps {
    /** Accessible label announced while busy. */
    label?: string;
    className?: string;
}

/**
 * Small, token-styled busy indicator. Announced to assistive tech as a polite status
 * region; the spinning ring itself is decorative (aria-hidden).
 */
const Spinner: React.FC<SpinnerProps> = ({ label = 'Loading', className = '' }) => (
    <span role="status" aria-label={label} data-testid="spinner" className={`inline-flex items-center ${className}`}>
        <span
            aria-hidden="true"
            className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
    </span>
);

export default Spinner;
