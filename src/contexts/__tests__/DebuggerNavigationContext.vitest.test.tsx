import { describe, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { DebuggerNavigationProvider, useDebuggerNavigation } from '../DebuggerNavigationContext';

// Test component that uses the hook
const TestComponent: React.FC = () => {
    const { navigate, currentNavigation, clearNavigation } = useDebuggerNavigation();
    
    return (
        <div>
            <div data-testid="current-navigation">
                {currentNavigation ? `${currentNavigation.target}:${currentNavigation.address}` : 'none'}
            </div>
            <button onClick={() => navigate(0x1000)}>Navigate Default</button>
            <button onClick={() => navigate(0x2000, 'memory')}>Navigate Memory</button>
            <button onClick={() => navigate(0x3000, 'disassembly')}>Navigate Disassembly</button>
            <button onClick={clearNavigation}>Clear</button>
        </div>
    );
};

describe('DebuggerNavigationContext', () => {
    describe('useDebuggerNavigation hook', () => {
        it('should throw error when used outside provider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const TestError = () => {
                try {
                    useDebuggerNavigation();
                    return null;
                } catch (error) {
                    return <div>{(error as Error).message}</div>;
                }
            };
            
            const { container } = render(<TestError />);
            expect(container.textContent).toBe('useDebuggerNavigation must be used within DebuggerNavigationProvider');
            
            consoleSpy.mockRestore();
        });
        
        it('should provide navigation context when used within provider', () => {
            const { result } = renderHook(() => useDebuggerNavigation(), {
                wrapper: ({ children }) => (
                    <DebuggerNavigationProvider>{children}</DebuggerNavigationProvider>
                ),
            });
            
            expect(result.current).toHaveProperty('navigate');
            expect(result.current).toHaveProperty('currentNavigation');
            expect(result.current).toHaveProperty('clearNavigation');
            expect(result.current).toHaveProperty('subscribeToNavigation');
            expect(result.current.currentNavigation).toBeNull();
        });
    });
    
    describe('DebuggerNavigationProvider', () => {
        it('should provide initial state', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('none');
        });
    });
    
    describe('navigate function', () => {
        it('should navigate to address with default target', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            const navigateButton = screen.getByText('Navigate Default');
            
            act(() => {
                navigateButton.click();
            });
            
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('disassembly:4096');
        });
        
        it('should navigate to memory target', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            const navigateButton = screen.getByText('Navigate Memory');
            
            act(() => {
                navigateButton.click();
            });
            
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('memory:8192');
        });
        
        it('should navigate to disassembly target', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            const navigateButton = screen.getByText('Navigate Disassembly');
            
            act(() => {
                navigateButton.click();
            });
            
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('disassembly:12288');
        });
        
        it('should update navigation when called multiple times', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            act(() => {
                screen.getByText('Navigate Default').click();
            });
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('disassembly:4096');
            
            act(() => {
                screen.getByText('Navigate Memory').click();
            });
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('memory:8192');
        });
    });
    
    describe('clearNavigation function', () => {
        it('should clear current navigation', () => {
            render(
                <DebuggerNavigationProvider>
                    <TestComponent />
                </DebuggerNavigationProvider>
            );
            
            // First navigate somewhere
            act(() => {
                screen.getByText('Navigate Default').click();
            });
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('disassembly:4096');
            
            // Then clear
            act(() => {
                screen.getByText('Clear').click();
            });
            expect(screen.getByTestId('current-navigation')).toHaveTextContent('none');
        });
    });
    
    describe('subscribeToNavigation function', () => {
        it('should notify subscribers of navigation events', () => {
            const subscriber1 = vi.fn();
            const subscriber2 = vi.fn();
            
            const TestSubscriber: React.FC = () => {
                const { navigate, subscribeToNavigation } = useDebuggerNavigation();
                
                React.useEffect(() => {
                    const unsubscribe1 = subscribeToNavigation(subscriber1);
                    const unsubscribe2 = subscribeToNavigation(subscriber2);
                    
                    return () => {
                        unsubscribe1();
                        unsubscribe2();
                    };
                }, [subscribeToNavigation]);
                
                return <button onClick={() => navigate(0x5000, 'memory')}>Navigate</button>;
            };
            
            render(
                <DebuggerNavigationProvider>
                    <TestSubscriber />
                </DebuggerNavigationProvider>
            );
            
            act(() => {
                screen.getByText('Navigate').click();
            });
            
            expect(subscriber1).toHaveBeenCalledWith({ address: 0x5000, target: 'memory' });
            expect(subscriber2).toHaveBeenCalledWith({ address: 0x5000, target: 'memory' });
        });
        
        it('should allow unsubscribing from navigation events', () => {
            const subscriber = vi.fn();
            let unsubscribe: (() => void) | null = null;
            
            const TestUnsubscriber: React.FC = () => {
                const { navigate, subscribeToNavigation } = useDebuggerNavigation();
                
                React.useEffect(() => {
                    unsubscribe = subscribeToNavigation(subscriber);
                }, [subscribeToNavigation]);
                
                return (
                    <>
                        <button onClick={() => navigate(0x6000)}>Navigate</button>
                        <button onClick={() => unsubscribe?.()}>Unsubscribe</button>
                    </>
                );
            };
            
            render(
                <DebuggerNavigationProvider>
                    <TestUnsubscriber />
                </DebuggerNavigationProvider>
            );
            
            // Navigate once - should be called
            act(() => {
                screen.getByText('Navigate').click();
            });
            expect(subscriber).toHaveBeenCalledTimes(1);
            
            // Unsubscribe
            act(() => {
                screen.getByText('Unsubscribe').click();
            });
            
            // Navigate again - should not be called
            act(() => {
                screen.getByText('Navigate').click();
            });
            expect(subscriber).toHaveBeenCalledTimes(1); // Still 1
        });
        
        it('should handle multiple subscribers and partial unsubscription', () => {
            const subscriber1 = vi.fn();
            const subscriber2 = vi.fn();
            const subscriber3 = vi.fn();
            let unsubscribe2: (() => void) | null = null;
            
            const TestMultipleSubscribers: React.FC = () => {
                const { navigate, subscribeToNavigation } = useDebuggerNavigation();
                
                React.useEffect(() => {
                    const unsub1 = subscribeToNavigation(subscriber1);
                    unsubscribe2 = subscribeToNavigation(subscriber2);
                    const unsub3 = subscribeToNavigation(subscriber3);
                    
                    return () => {
                        unsub1();
                        unsub3();
                    };
                }, [subscribeToNavigation]);
                
                return (
                    <>
                        <button onClick={() => navigate(0x7000)}>Navigate</button>
                        <button onClick={() => unsubscribe2?.()}>Unsubscribe 2</button>
                    </>
                );
            };
            
            render(
                <DebuggerNavigationProvider>
                    <TestMultipleSubscribers />
                </DebuggerNavigationProvider>
            );
            
            // All should be called
            act(() => {
                screen.getByText('Navigate').click();
            });
            expect(subscriber1).toHaveBeenCalledTimes(1);
            expect(subscriber2).toHaveBeenCalledTimes(1);
            expect(subscriber3).toHaveBeenCalledTimes(1);
            
            // Unsubscribe subscriber2
            act(() => {
                screen.getByText('Unsubscribe 2').click();
            });
            
            // Navigate again - only 1 and 3 should be called
            act(() => {
                screen.getByText('Navigate').click();
            });
            expect(subscriber1).toHaveBeenCalledTimes(2);
            expect(subscriber2).toHaveBeenCalledTimes(1); // Still 1
            expect(subscriber3).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('integration scenarios', () => {
        it('should handle rapid navigation changes', () => {
            const subscriber = vi.fn();
            
            const TestRapidNavigation: React.FC = () => {
                const { navigate, subscribeToNavigation, currentNavigation } = useDebuggerNavigation();
                
                React.useEffect(() => {
                    return subscribeToNavigation(subscriber);
                }, [subscribeToNavigation]);
                
                return (
                    <>
                        <div data-testid="nav-state">
                            {currentNavigation ? `${currentNavigation.address}` : 'none'}
                        </div>
                        <button onClick={() => {
                            navigate(0x1000);
                            navigate(0x2000);
                            navigate(0x3000);
                        }}>Rapid Navigate</button>
                    </>
                );
            };
            
            render(
                <DebuggerNavigationProvider>
                    <TestRapidNavigation />
                </DebuggerNavigationProvider>
            );
            
            act(() => {
                screen.getByText('Rapid Navigate').click();
            });
            
            // Should have final state
            expect(screen.getByTestId('nav-state')).toHaveTextContent('12288');
            
            // Subscriber should have been called 3 times
            expect(subscriber).toHaveBeenCalledTimes(3);
            expect(subscriber).toHaveBeenNthCalledWith(1, { address: 0x1000, target: 'disassembly' });
            expect(subscriber).toHaveBeenNthCalledWith(2, { address: 0x2000, target: 'disassembly' });
            expect(subscriber).toHaveBeenNthCalledWith(3, { address: 0x3000, target: 'disassembly' });
        });
        
        it('should maintain separate navigation state for different providers', () => {
            const TestNestedProviders: React.FC = () => {
                return (
                    <>
                        <DebuggerNavigationProvider>
                            <div data-testid="provider1">
                                <TestComponent />
                            </div>
                        </DebuggerNavigationProvider>
                        <DebuggerNavigationProvider>
                            <div data-testid="provider2">
                                <TestComponent />
                            </div>
                        </DebuggerNavigationProvider>
                    </>
                );
            };
            
            render(<TestNestedProviders />);
            
            const provider1Nav = screen.getByTestId('provider1').querySelector('[data-testid="current-navigation"]')!;
            const provider2Nav = screen.getByTestId('provider2').querySelector('[data-testid="current-navigation"]')!;
            
            // Navigate in first provider
            act(() => {
                const button = screen.getByTestId('provider1').querySelector('button')!;
                button.click();
            });
            
            expect(provider1Nav).toHaveTextContent('disassembly:4096');
            expect(provider2Nav).toHaveTextContent('none');
        });
    });
});