import { useState, useEffect, useCallback, useRef } from 'react';

interface UseNavigableComponentOptions {
    initialAddress?: number;
    onAddressChange?: (address: number) => void;
}

interface UseNavigableComponentReturn {
    currentAddress: number;
    navigateInternal: (address: number) => void;
}

/**
 * Hook for standardized navigation synchronization between components.
 * Prevents feedback loops and race conditions when multiple components
 * need to stay synchronized on the same address.
 */
export function useNavigableComponent({
    initialAddress = 0x0000,
    onAddressChange
}: UseNavigableComponentOptions): UseNavigableComponentReturn {
    const [currentAddress, setCurrentAddress] = useState(initialAddress);
    const lastExternalAddress = useRef<number | undefined>(initialAddress);
    const isInternalNavigation = useRef(false);

    // Handle external navigation (from parent component)
    useEffect(() => {
        // Only sync if this is an external change and we're not in the middle of internal navigation
        if (initialAddress !== undefined && 
            initialAddress !== lastExternalAddress.current &&
            !isInternalNavigation.current) {
            lastExternalAddress.current = initialAddress;
            setCurrentAddress(initialAddress);
        }
    }, [initialAddress]);

    // Notify parent of address changes, but only for internal navigation
    useEffect(() => {
        if (onAddressChange && isInternalNavigation.current) {
            onAddressChange(currentAddress);
        }
    }, [currentAddress, onAddressChange]);

    // Handle internal navigation (user interaction within component)
    const navigateInternal = useCallback((address: number) => {
        // Mark as internal navigation to prevent feedback
        isInternalNavigation.current = true;
        setCurrentAddress(address);
        
        // Reset flag after a microtask to allow effects to run
        Promise.resolve().then(() => {
            isInternalNavigation.current = false;
        });
    }, []);

    return {
        currentAddress,
        navigateInternal
    };
}