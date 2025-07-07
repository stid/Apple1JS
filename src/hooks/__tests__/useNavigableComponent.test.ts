import { renderHook, act } from '@testing-library/react';
import { useNavigableComponent } from '../useNavigableComponent';

describe('useNavigableComponent', () => {
    it('should initialize with the provided initial address', () => {
        const { result } = renderHook(() => 
            useNavigableComponent({ initialAddress: 0x1234 })
        );

        expect(result.current.currentAddress).toBe(0x1234);
    });

    it('should use default address when no initial address provided', () => {
        const { result } = renderHook(() => 
            useNavigableComponent({})
        );

        expect(result.current.currentAddress).toBe(0x0000);
    });

    describe('external navigation', () => {
        it('should sync when initial address changes externally', () => {
            const { result, rerender } = renderHook(
                ({ address }) => useNavigableComponent({ initialAddress: address }),
                { initialProps: { address: 0x1000 } }
            );

            expect(result.current.currentAddress).toBe(0x1000);

            // Change external address
            rerender({ address: 0x2000 });
            
            expect(result.current.currentAddress).toBe(0x2000);
        });

        it('should not call onAddressChange for external navigation', () => {
            const onAddressChange = jest.fn();
            const { rerender } = renderHook(
                ({ address }) => useNavigableComponent({ 
                    initialAddress: address,
                    onAddressChange 
                }),
                { initialProps: { address: 0x1000 } }
            );

            // External navigation should not trigger callback
            rerender({ address: 0x2000 });
            
            expect(onAddressChange).not.toHaveBeenCalled();
        });

        it('should ignore duplicate external addresses', () => {
            const onAddressChange = jest.fn();
            const { result, rerender } = renderHook(
                ({ address }) => useNavigableComponent({ 
                    initialAddress: address,
                    onAddressChange 
                }),
                { initialProps: { address: 0x1000 } }
            );

            // Rerender with same address
            rerender({ address: 0x1000 });
            
            expect(result.current.currentAddress).toBe(0x1000);
            expect(onAddressChange).not.toHaveBeenCalled();
        });
    });

    describe('internal navigation', () => {
        it('should update address when navigating internally', () => {
            const { result } = renderHook(() => 
                useNavigableComponent({ initialAddress: 0x1000 })
            );

            act(() => {
                result.current.navigateInternal(0x2000);
            });

            expect(result.current.currentAddress).toBe(0x2000);
        });

        it('should call onAddressChange for internal navigation', async () => {
            const onAddressChange = jest.fn();
            const { result } = renderHook(() => 
                useNavigableComponent({ 
                    initialAddress: 0x1000,
                    onAddressChange 
                })
            );

            act(() => {
                result.current.navigateInternal(0x2000);
            });

            // Wait for the promise to resolve
            await act(async () => {
                await Promise.resolve();
            });

            expect(onAddressChange).toHaveBeenCalledWith(0x2000);
        });

        it('should handle multiple internal navigations', async () => {
            const onAddressChange = jest.fn();
            const { result } = renderHook(() => 
                useNavigableComponent({ 
                    initialAddress: 0x1000,
                    onAddressChange 
                })
            );

            act(() => {
                result.current.navigateInternal(0x2000);
            });

            await act(async () => {
                await Promise.resolve();
            });

            act(() => {
                result.current.navigateInternal(0x3000);
            });

            await act(async () => {
                await Promise.resolve();
            });

            expect(result.current.currentAddress).toBe(0x3000);
            expect(onAddressChange).toHaveBeenCalledTimes(2);
            expect(onAddressChange).toHaveBeenNthCalledWith(1, 0x2000);
            expect(onAddressChange).toHaveBeenNthCalledWith(2, 0x3000);
        });
    });

    describe('feedback loop prevention', () => {
        it('should prevent feedback when internal navigation triggers external update', async () => {
            const onAddressChange = jest.fn();
            const { result, rerender } = renderHook(
                ({ address }) => useNavigableComponent({ 
                    initialAddress: address,
                    onAddressChange 
                }),
                { initialProps: { address: 0x1000 } }
            );

            // Internal navigation
            act(() => {
                result.current.navigateInternal(0x2000);
            });

            await act(async () => {
                await Promise.resolve();
            });

            // Simulate parent updating the external address in response
            rerender({ address: 0x2000 });

            // Should not cause another update or callback
            expect(result.current.currentAddress).toBe(0x2000);
            expect(onAddressChange).toHaveBeenCalledTimes(1);
        });

        it('should block external updates during internal navigation', () => {
            const { result, rerender } = renderHook(
                ({ address }) => useNavigableComponent({ initialAddress: address }),
                { initialProps: { address: 0x1000 } }
            );

            // Start internal navigation
            act(() => {
                result.current.navigateInternal(0x2000);
            });

            // Try to update externally before promise resolves
            rerender({ address: 0x3000 });

            // Should keep internal navigation value
            expect(result.current.currentAddress).toBe(0x2000);
        });
    });

    describe('edge cases', () => {
        it('should handle undefined initial address', () => {
            const { result } = renderHook(() => 
                useNavigableComponent({})
            );

            expect(result.current.currentAddress).toBe(0x0000);
        });

        it('should handle changing from undefined to defined address', () => {
            interface Props { address?: number }
            const { result, rerender } = renderHook(
                ({ address }: Props) => useNavigableComponent(address !== undefined ? { initialAddress: address } : {}),
                { initialProps: {} }
            );

            expect(result.current.currentAddress).toBe(0x0000);

            rerender({ address: 0x1234 });
            
            expect(result.current.currentAddress).toBe(0x1234);
        });

        it('should maintain navigateInternal function reference', () => {
            const { result, rerender } = renderHook(() => 
                useNavigableComponent({ initialAddress: 0x1000 })
            );

            const navigateFn = result.current.navigateInternal;

            rerender();

            expect(result.current.navigateInternal).toBe(navigateFn);
        });
    });
});